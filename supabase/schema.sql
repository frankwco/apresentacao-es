-- =============================================================================
-- ES IFPR – Disputa de Mensagens
-- Schema Supabase / PostgreSQL
--
-- Como aplicar:
--   Opção A (CLI): supabase db push
--   Opção B (Dashboard): Cole no SQL Editor e execute
--
-- Gere os tipos TypeScript após aplicar:
--   npx supabase gen types typescript --project-id <id> > src/lib/types.ts
-- =============================================================================


-- =============================================================================
-- TABELAS
-- =============================================================================

-- -----------------------------------------------------------------------------
-- rounds
-- Cada rodada (disputa) criada pelo administrador.
-- Uma rodada pode estar aberta (open) ou encerrada (closed).
-- Só pode haver uma rodada com status = 'open' por vez – controlado pela
-- aplicação e pelo trigger abaixo.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS rounds (
  id          uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  title       text         NOT NULL
                           CHECK (char_length(trim(title)) BETWEEN 1 AND 200),
  prompt      text         NOT NULL,        -- enunciado/tema exibido ao participante
  status      text         NOT NULL DEFAULT 'closed'
                           CHECK (status IN ('open', 'closed')),
  started_at  timestamptz,                  -- preenchido quando status → 'open'
  ended_at    timestamptz,                  -- preenchido quando status → 'closed'
  duration_minutes integer                  -- duração opcional em minutos (para contador regressivo)
                           CHECK (duration_minutes IS NULL OR duration_minutes > 0),
  created_at  timestamptz  NOT NULL DEFAULT now(),

  CONSTRAINT rounds_dates_check
    CHECK (ended_at IS NULL OR started_at IS NULL OR ended_at >= started_at)
);

-- -----------------------------------------------------------------------------
-- players
-- Identidade de um participante dentro de uma rodada é (round_id, nome) — não
-- device_id. Isso permite que o mesmo aparelho/aba envie como "pessoas"
-- diferentes trocando o nome, cada uma com seu próprio histórico/nota; ao
-- reenviar com o MESMO nome na mesma rodada, o upsert atualiza a mesma linha.
-- device_id é um UUID gerado no cliente e armazenado em localStorage (mantido
-- apenas para referência/depuração, não é mais a chave de identidade).
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS players (
  id          uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id    uuid         NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
  device_id   text         NOT NULL
                           CHECK (char_length(device_id) >= 8),
  nome        text         NOT NULL
                           CHECK (char_length(trim(nome)) BETWEEN 1 AND 100),
  escola      text
                           CHECK (escola IS NULL OR char_length(trim(escola)) <= 100),
  created_at  timestamptz  NOT NULL DEFAULT now(),

  CONSTRAINT players_round_nome_uq UNIQUE (round_id, nome)
);

-- -----------------------------------------------------------------------------
-- submissions
-- Cada tentativa enviada por um participante.
-- nota e feedback são preenchidos de forma assíncrona pela função de IA
-- (Edge Function ou webhook externo). Enquanto pendentes, ficam NULL.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS submissions (
  id            uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id      uuid          NOT NULL REFERENCES rounds(id)   ON DELETE CASCADE,
  player_id     uuid          NOT NULL REFERENCES players(id)  ON DELETE CASCADE,
  mensagem      text          NOT NULL
                              CHECK (char_length(trim(mensagem)) BETWEEN 1 AND 500),
  -- Snapshot do tema da rodada no momento do envio. O admin pode editar
  -- title/prompt de uma rodada aberta a qualquer momento — sem este snapshot,
  -- a avaliação por IA usaria o tema ATUAL (possivelmente diferente do que o
  -- participante viu ao escrever a mensagem) em vez do tema vigente no envio.
  round_title   text,
  round_prompt  text,
  -- Pontuação bruta 0–100 (soma dos 4 critérios) — granularidade maior evita
  -- empates entre dezenas de participantes concorrendo pelo mesmo tema.
  nota          numeric(5, 1)
                              CHECK (nota IS NULL OR (nota >= 0 AND nota <= 100)),
  feedback      text,
  criterios     jsonb,        -- breakdown: { criatividade, clareza, relacao_es, impacto, total }
  status        text         NOT NULL DEFAULT 'pending'
                              CHECK (status IN ('pending', 'evaluated', 'error')),
  hidden        boolean       NOT NULL DEFAULT false,  -- moderação pelo admin
  created_at    timestamptz   NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- settings
-- Chave-valor para configurações globais da aplicação.
-- Exemplos: active_round_id, scoring_model, allow_resubmit.
-- Escrita restrita ao service role via RLS.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS settings (
  key         text         PRIMARY KEY
                           CHECK (char_length(key) BETWEEN 1 AND 100),
  value       jsonb        NOT NULL DEFAULT 'null'::jsonb,
  created_at  timestamptz  NOT NULL DEFAULT now(),
  updated_at  timestamptz  NOT NULL DEFAULT now()
);


-- =============================================================================
-- ÍNDICES
-- =============================================================================

-- rounds: busca por status (encontrar rodada aberta rapidamente)
CREATE INDEX IF NOT EXISTS idx_rounds_status
  ON rounds (status);

CREATE INDEX IF NOT EXISTS idx_rounds_created_at
  ON rounds (created_at DESC);

-- players: lookup por rodada e por dispositivo
CREATE INDEX IF NOT EXISTS idx_players_round_id
  ON players (round_id);

CREATE INDEX IF NOT EXISTS idx_players_device_id
  ON players (device_id);

-- submissions: padrões de consulta mais frequentes
CREATE INDEX IF NOT EXISTS idx_submissions_round_id
  ON submissions (round_id);

CREATE INDEX IF NOT EXISTS idx_submissions_player_id
  ON submissions (player_id);

-- nota DESC NULLS LAST: ordena pelo ranking sem precisar de ORDER BY complexo
CREATE INDEX IF NOT EXISTS idx_submissions_nota
  ON submissions (nota DESC NULLS LAST);

-- Consultas de ranking que filtram por round e ordenam por data
CREATE INDEX IF NOT EXISTS idx_submissions_round_created
  ON submissions (round_id, created_at ASC);


-- =============================================================================
-- FUNÇÕES E TRIGGERS
-- =============================================================================

-- -----------------------------------------------------------------------------
-- trigger_set_updated_at
-- Mantém settings.updated_at atualizado automaticamente.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_settings_updated_at ON settings;
CREATE TRIGGER trg_settings_updated_at
  BEFORE UPDATE ON settings
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- -----------------------------------------------------------------------------
-- trigger_enforce_open_round
-- Garante que só uma rodada fique aberta por vez.
-- Ao abrir uma rodada, encerra todas as outras e registra os timestamps.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION enforce_single_open_round()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  -- Abrindo uma rodada: encerra todas as demais
  IF NEW.status = 'open' AND (OLD.status IS DISTINCT FROM 'open') THEN
    UPDATE rounds
       SET status    = 'closed',
           ended_at  = now()
     WHERE status = 'open'
       AND id <> NEW.id;

    NEW.started_at = COALESCE(NEW.started_at, now());
    NEW.ended_at   = NULL;
  END IF;

  -- Encerrando uma rodada: registra horário de fim
  IF NEW.status = 'closed' AND OLD.status = 'open' THEN
    NEW.ended_at = COALESCE(NEW.ended_at, now());
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_open_round ON rounds;
CREATE TRIGGER trg_enforce_open_round
  BEFORE UPDATE OF status ON rounds
  FOR EACH ROW EXECUTE FUNCTION enforce_single_open_round();

-- -----------------------------------------------------------------------------
-- trigger_check_submission_round
-- Impede que uma submission seja inserida numa rodada diferente da do player.
-- Necessário porque PostgreSQL não permite subqueries em CHECK constraints.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION check_submission_round_matches_player()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  player_round_id uuid;
BEGIN
  SELECT round_id INTO player_round_id
    FROM players
   WHERE id = NEW.player_id;

  IF player_round_id IS DISTINCT FROM NEW.round_id THEN
    RAISE EXCEPTION
      'submissions.round_id (%) must match the player''s round_id (%)',
      NEW.round_id, player_round_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_submission_round_check ON submissions;
CREATE TRIGGER trg_submission_round_check
  BEFORE INSERT OR UPDATE OF round_id, player_id ON submissions
  FOR EACH ROW EXECUTE FUNCTION check_submission_round_matches_player();


-- =============================================================================
-- RANKING VIEW
-- =============================================================================
-- ranking_view
-- Classifica os participantes de cada rodada pela melhor nota obtida.
--
-- Critérios de desempate (ordem):
--   1. melhor_nota          DESC  – maior nota vence
--   2. tentativas           ASC   – quem chegou lá com menos tentativas vence
--   3. primeira_melhor_nota_em ASC – quem atingiu a melhor nota mais cedo vence
--
-- Só aparecem participantes com pelo menos uma submissão avaliada (nota IS NOT NULL).
-- tentativas conta TODAS as submissões (avaliadas + pendentes).
-- =============================================================================

CREATE OR REPLACE VIEW ranking_view AS
WITH

  -- Passo 1: melhor nota e total de tentativas por participante por rodada
  best_per_player AS (
    SELECT
      player_id,
      round_id,
      MAX(nota)         AS melhor_nota,
      COUNT(*)          AS tentativas     -- todas as submissões não ocultadas
    FROM submissions
    WHERE NOT hidden
    GROUP BY player_id, round_id
    HAVING MAX(nota) IS NOT NULL          -- exclui quem nunca foi avaliado
  ),

  -- Passo 2: quando a melhor nota foi atingida pela primeira vez
  first_best_at AS (
    SELECT
      s.player_id,
      s.round_id,
      MIN(s.created_at) AS primeira_melhor_nota_em
    FROM submissions          s
    INNER JOIN best_per_player b
           ON  s.player_id = b.player_id
           AND s.round_id  = b.round_id
           AND s.nota       = b.melhor_nota   -- somente submissões com a nota máxima
    GROUP BY s.player_id, s.round_id
  )

SELECT
  -- Posição dentro de cada rodada, aplicando os critérios de desempate
  ROW_NUMBER() OVER (
    PARTITION BY bp.round_id
    ORDER BY
      bp.melhor_nota                DESC,
      bp.tentativas                 ASC,
      fb.primeira_melhor_nota_em    ASC
  )                                         AS posicao,

  -- Identificação do participante
  p.id                                      AS player_id,
  p.device_id,
  p.nome,
  p.escola,

  -- Rodada
  bp.round_id,
  r.title                                   AS round_title,
  r.status                                  AS round_status,

  -- Métricas
  bp.melhor_nota,
  bp.tentativas::bigint                     AS tentativas,
  fb.primeira_melhor_nota_em

FROM       best_per_player  bp
INNER JOIN first_best_at    fb ON bp.player_id = fb.player_id
                               AND bp.round_id  = fb.round_id
INNER JOIN players          p  ON bp.player_id = p.id
INNER JOIN rounds           r  ON bp.round_id  = r.id;


-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================
-- A anon key do Supabase é pública por design.
-- O acesso de escrita sensível (rounds, settings) deve ser feito
-- exclusivamente via service role (backend / Edge Function).
-- =============================================================================

ALTER TABLE rounds      ENABLE ROW LEVEL SECURITY;
ALTER TABLE players     ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings    ENABLE ROW LEVEL SECURITY;

-- rounds: leitura pública; escrita liberada ao anon (protegida pela senha do
-- painel admin no front-end, não há Supabase Auth real neste projeto)
-- DROP + CREATE (em vez de CREATE POLICY IF NOT EXISTS, que o Postgres não
-- suporta) torna o script seguro para reexecutar sem falhar em "already exists".
DROP POLICY IF EXISTS "rounds_public_read" ON rounds;
CREATE POLICY "rounds_public_read"
  ON rounds FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "rounds_anon_insert" ON rounds;
CREATE POLICY "rounds_anon_insert"
  ON rounds FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "rounds_anon_update" ON rounds;
CREATE POLICY "rounds_anon_update"
  ON rounds FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- players: leitura pública; anon pode inserir/atualizar seu próprio registro
DROP POLICY IF EXISTS "players_public_read" ON players;
CREATE POLICY "players_public_read"
  ON players FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "players_anon_insert" ON players;
CREATE POLICY "players_anon_insert"
  ON players FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "players_anon_update_own" ON players;
CREATE POLICY "players_anon_update_own"
  ON players FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- submissions: leitura pública; anon pode inserir em rodadas abertas
DROP POLICY IF EXISTS "submissions_public_read" ON submissions;
CREATE POLICY "submissions_public_read"
  ON submissions FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "submissions_insert_open_round" ON submissions;
CREATE POLICY "submissions_insert_open_round"
  ON submissions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM rounds
       WHERE id = round_id
         AND status = 'open'
    )
  );

-- settings: leitura pública; escrita apenas via service role (sem policy de escrita)
DROP POLICY IF EXISTS "settings_public_read" ON settings;
CREATE POLICY "settings_public_read"
  ON settings FOR SELECT
  USING (true);


-- =============================================================================
-- REALTIME
-- =============================================================================
-- Sem isso, `supabase.channel(...).on('postgres_changes', ...)` nunca recebe
-- eventos — o front-end só vê dados novos recarregando a página inteira.
-- rounds: para o jogador saber quando o admin fecha a rodada em tempo real.
-- submissions/players: para o ranking e o painel admin atualizarem sozinhos.
-- =============================================================================

-- ALTER PUBLICATION ... ADD TABLE falha se a tabela já for membro — o bloco
-- DO abaixo torna a seção segura para reexecutar.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
     WHERE pubname = 'supabase_realtime' AND tablename = 'rounds'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE rounds;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
     WHERE pubname = 'supabase_realtime' AND tablename = 'players'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE players;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
     WHERE pubname = 'supabase_realtime' AND tablename = 'submissions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE submissions;
  END IF;
END $$;


-- =============================================================================
-- DADOS INICIAIS (settings)
-- =============================================================================

INSERT INTO settings (key, value) VALUES
  ('active_round_id',  'null'::jsonb),          -- uuid da rodada ativa ou null
  ('scoring_model',    '"gpt-4o-mini"'::jsonb),  -- modelo de IA usado para avaliar
  ('max_nota',         '100'::jsonb),            -- nota máxima possível
  ('allow_resubmit',   'true'::jsonb)            -- permite múltiplas submissões
ON CONFLICT (key) DO NOTHING;

-- Corrige max_nota para quem já tinha a linha inserida com o valor antigo (10)
UPDATE settings SET value = '100'::jsonb WHERE key = 'max_nota' AND value = '10'::jsonb;


-- =============================================================================
-- MIGRATION – execute apenas se as tabelas já existiam sem estas colunas
-- =============================================================================

ALTER TABLE rounds
  ADD COLUMN IF NOT EXISTS duration_minutes integer
    CHECK (duration_minutes IS NULL OR duration_minutes > 0);

ALTER TABLE submissions
  ADD COLUMN IF NOT EXISTS hidden boolean NOT NULL DEFAULT false;

ALTER TABLE submissions
  ADD COLUMN IF NOT EXISTS criterios jsonb;

ALTER TABLE submissions
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'evaluated', 'error'));

-- Snapshot do tema (title/prompt) vigente no momento do envio — ver comentário
-- na definição da tabela acima. Backfill usa o tema atual da rodada como
-- melhor aproximação disponível para submissões já existentes.
ALTER TABLE submissions
  ADD COLUMN IF NOT EXISTS round_title  text;

ALTER TABLE submissions
  ADD COLUMN IF NOT EXISTS round_prompt text;

UPDATE submissions s
   SET round_title  = r.title,
       round_prompt = r.prompt
  FROM rounds r
 WHERE r.id = s.round_id
   AND s.round_prompt IS NULL;

-- nota passa de escala 0–10 para 0–100 (mais granularidade, menos empates).
-- NÃO fazemos rescale automático de notas já gravadas (ex: nota*10) porque
-- essa operação não é segura para reexecutar (rodar o script 2x dobraria os
-- valores de novo). Se houver submissões de TESTE avaliadas na escala antiga,
-- apague-as manualmente antes do evento real:
--   DELETE FROM submissions WHERE round_id = '<uuid-da-rodada-de-teste>';
ALTER TABLE submissions DROP CONSTRAINT IF EXISTS submissions_nota_check;
ALTER TABLE submissions ADD CONSTRAINT submissions_nota_check
  CHECK (nota IS NULL OR (nota >= 0 AND nota <= 100));

-- Índice para filtrar submissões visíveis no ranking
CREATE INDEX IF NOT EXISTS idx_submissions_hidden
  ON submissions (round_id, hidden)
  WHERE NOT hidden;

-- Identidade do jogador passa a ser (round_id, nome) em vez de (device_id, round_id) —
-- trocar o nome no mesmo aparelho/aba agora cria um jogador novo em vez de
-- sobrescrever o antigo. Execute apenas se o banco já tinha a constraint antiga.
ALTER TABLE players
  DROP CONSTRAINT IF EXISTS players_device_round_uq;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'players_round_nome_uq'
  ) THEN
    ALTER TABLE players ADD CONSTRAINT players_round_nome_uq UNIQUE (round_id, nome);
  END IF;
END $$;

-- Atualiza a view para incluir o filtro de hidden (re-execute sempre que alterar)
-- CREATE OR REPLACE VIEW ranking_view AS ... (já definida acima, re-execute o bloco)
