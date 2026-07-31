// Conteúdo alinhado ao PPC (Projeto Pedagógico de Curso) de Engenharia de
// Software do IFPR – Campus Paranavaí, versão 2025 (Resolução n.º 37/2018).
// Fonte: https://ifpr.edu.br/paranavai/wp-content/uploads/sites/21/2025/01/PPC-de-Engenharia-de-Software-2025.pdf

const aprendizados = [
  { icon: '💻', titulo: 'Programação', desc: 'Da lógica básica à orientação a objetos, passando por estruturas de dados, desenvolvimento web e para dispositivos móveis.', disciplinas: 'Algoritmos e Estruturas de Dados I e II · Programação Orientada a Objetos · Programação Web · Dispositivos Móveis' },
  { icon: '🗄️', titulo: 'Banco de dados', desc: 'Aprende a modelar, guardar e consultar informações em sistemas que alimentam apps, sites e sistemas de empresas.', disciplinas: 'Banco de Dados I e II' },
  { icon: '🔒', titulo: 'Redes e segurança', desc: 'Entende como redes de computadores funcionam e como proteger sistemas de ataques e vazamentos de dados.', disciplinas: 'Redes de Computadores e Segurança' },
  { icon: '📐', titulo: 'Arquitetura de software', desc: 'Aprende a planejar softwares complexos antes de escrever uma linha de código, usando padrões consolidados da indústria.', disciplinas: 'Arquitetura e Padrões de Software · Construção de Software · Interação Humano-Computador' },
  { icon: '🤖', titulo: 'Inteligência Artificial', desc: 'Entende como sistemas de IA e aprendizagem de máquina funcionam, por meio de componentes optativos do curso.', disciplinas: 'Inteligência Artificial · Aprendizagem de Máquina (optativas)' },
  { icon: '🚀', titulo: 'Gestão e empreendedorismo', desc: 'Aprende a gerenciar projetos e serviços de software e a empreender com base em tecnologia.', disciplinas: 'Governança e Gestão de Serviços de Software · Empreendedorismo em TI' },
]

const areas = [
  { icon: '🛠️', titulo: 'Engenheiro de Software',      nicho: 'Ciclo de vida completo',        desc: 'Elicita, projeta, valida, implanta e mantém sistemas de software de qualidade — a formação central do curso.' },
  { icon: '👨‍💻', titulo: 'Desenvolvedor / Programador', nicho: 'Front-end · Back-end · Mobile', desc: 'Escreve o código que faz apps e sites funcionarem, uma das profissões mais procuradas do país.' },
  { icon: '🏗️', titulo: 'Arquiteto de Software',        nicho: 'Sistemas · Padrões · Escala',    desc: 'Define como sistemas grandes são estruturados para funcionar bem e crescer sem cair.' },
  { icon: '📊', titulo: 'Analista de Sistemas',          nicho: 'Requisitos · Processos · Negócio', desc: 'Faz a ponte entre o que a empresa precisa e o que os desenvolvedores vão construir.' },
  { icon: '📋', titulo: 'Gerente de Projetos',           nicho: 'Planejamento · Prazos · Custos', desc: 'Gerencia projetos de software conciliando prazo, custo, qualidade e riscos.' },
  { icon: '🧪', titulo: 'Líder Técnico / Testes',        nicho: 'Qualidade · Automação',          desc: 'Lidera tecnicamente uma equipe ou garante a qualidade de sistemas por meio de testes automatizados.' },
]

const projetos = [
  { icon: '🏥', titulo: 'App de Saúde Mental',    desc: 'Sistema para estudantes registrarem humor e receberem recomendações personalizadas.',           tags: ['Mobile', 'IA', 'UX'] },
  { icon: '🌿', titulo: 'Monitor Ambiental',       desc: 'Plataforma que coleta dados de sensores IoT para monitorar qualidade do ar e rios na região.', tags: ['IoT', 'Cloud', 'Dados'] },
  { icon: '🎓', titulo: 'Plataforma de Ensino',    desc: 'Sistema de cursos online com videoaulas, exercícios adaptativos e certificados digitais.',      tags: ['Web', 'Banco de Dados', 'API'] },
  { icon: '♿', titulo: 'App de Acessibilidade',   desc: 'Aplicativo que descreve imagens, lê texto em voz alta e traduz Libras em tempo real.',          tags: ['IA', 'Mobile', 'Acessibilidade'] },
  { icon: '🗳️', titulo: 'Sistema de Votação',      desc: 'Como este sistema aqui! Votação em tempo real com ranking automático e avaliação por IA.',      tags: ['Realtime', 'IA', 'Web'] },
  { icon: '🚌', titulo: 'Mobilidade Urbana',       desc: 'App que informa rotas de ônibus em tempo real integrando dados públicos da cidade.',            tags: ['API', 'Mapas', 'Open Data'] },
]

const tecnologias = [
  { categoria: 'Linguagens',     cor: 'blue',   itens: ['Python', 'JavaScript', 'TypeScript', 'Java', 'C / C++'] },
  { categoria: 'Frontend',       cor: 'cyan',   itens: ['React', 'Vue.js', 'Angular', 'HTML & CSS', 'Tailwind'] },
  { categoria: 'Backend',        cor: 'green',  itens: ['Node.js', 'Spring Boot', 'Django', 'FastAPI', 'GraphQL'] },
  { categoria: 'Banco de Dados', cor: 'yellow', itens: ['PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'Supabase'] },
  { categoria: 'DevOps & Cloud', cor: 'orange', itens: ['Git & GitHub', 'Docker', 'CI/CD', 'AWS / GCP', 'Linux'] },
  { categoria: 'IA & Dados',     cor: 'purple', itens: ['TensorFlow', 'PyTorch', 'scikit-learn', 'LangChain', 'SQL Analytics'] },
]

// Matriz curricular oficial (Quadro 5 do PPC) — regime ANUAL, não semestral.
// Carga horária (ch) em horas-aula (50min), conforme convenção do documento.
const grade = [
  { periodo: 1, label: '1º Ano', ch: 800, disciplinas: [
    { nome: 'Ética, Cultura e Sociedade', ch: 80 },
    { nome: 'Engenharia Econômica', ch: 80 },
    { nome: 'Inglês Instrumental', ch: 80 },
    { nome: 'Leitura e Produção de Gêneros Acadêmicos', ch: 80 },
    { nome: 'Matemática Discreta e Lógica', ch: 80 },
    { nome: 'Algoritmos e Estruturas de Dados I', ch: 160 },
    { nome: 'Banco de Dados I', ch: 80 },
    { nome: 'Engenharia de Software', ch: 80 },
    { nome: 'Metodologia de Pesquisa em Engenharia de Software', ch: 80 },
  ] },
  { periodo: 2, label: '2º Ano', ch: 800, disciplinas: [
    { nome: 'Cálculo', ch: 80 },
    { nome: 'Empreendedorismo em Tecnologia da Informação', ch: 80 },
    { nome: 'Algoritmos e Estruturas de Dados II', ch: 80 },
    { nome: 'Arquitetura de Computadores', ch: 80 },
    { nome: 'Banco de Dados II', ch: 80 },
    { nome: 'Programação Orientada a Objetos', ch: 160 },
    { nome: 'Práticas de Extensão', ch: 160 },
    { nome: 'Análise e Projeto de Sistemas', ch: 80 },
  ] },
  { periodo: 3, label: '3º Ano', ch: 800, disciplinas: [
    { nome: 'Probabilidade e Estatística', ch: 80 },
    { nome: 'Desenvolvimento para Dispositivos Móveis', ch: 160 },
    { nome: 'Programação Web', ch: 160 },
    { nome: 'Sistemas Operacionais', ch: 80 },
    { nome: 'Arquitetura e Padrões de Software', ch: 80 },
    { nome: 'Construção de Software', ch: 80 },
    { nome: 'Projeto Integrador', ch: 80 },
    { nome: 'Interação Humano-Computador', ch: 80 },
  ] },
  { periodo: 4, label: '4º Ano', ch: 720, disciplinas: [
    { nome: 'Redes de Computadores e Segurança', ch: 80 },
    { nome: 'Tópicos em Computação', ch: 160 },
    { nome: 'Governança e Gestão de Serviços de Software', ch: 80 },
    { nome: 'Novas Aplicações em Engenharia de Software', ch: 80 },
    { nome: 'Projeto de Software Avançado', ch: 160 },
    { nome: 'Teste de Software', ch: 80 },
    { nome: 'Trabalho de Conclusão de Curso', ch: 80 },
  ] },
]

// Componentes obrigatórios que não entram na grade por ano (Quadro 5 do PPC).
const componentesAdicionais = [
  { icon: '💼', titulo: 'Estágio Curricular Supervisionado', chRelogio: 147, desc: 'Obrigatório para colar grau. Convênio ativo com o CIEE/PR para viabilizar as vagas.' },
  { icon: '📝', titulo: 'Trabalho de Conclusão de Curso',    chRelogio: null, desc: 'Projeto técnico ou científico desenvolvido no último ano, com orientador e banca avaliadora.' },
  { icon: '🎯', titulo: 'Atividades Complementares',          chRelogio: 200, desc: 'Eventos, monitorias, iniciação científica e demais atividades acadêmicas fora da grade regular.' },
  { icon: '🌎', titulo: 'Curricularização da Extensão',       chRelogio: 188, desc: 'Atividades de extensão junto à comunidade, integradas ao longo do curso (inclui a disciplina Práticas de Extensão).' },
  { icon: '🧭', titulo: 'Componentes Optativos',              chRelogio: 67,  desc: 'Mínimo livre entre Inteligência Artificial, Aprendizagem de Máquina, Ciência de Dados, Sistemas Embarcados e outras.' },
]

const porqueIFPR = [
  { icon: '🏛️', titulo: 'Gratuito e federal',      desc: 'O IFPR é uma instituição pública federal. Zero mensalidade, diploma de bacharelado reconhecido pelo MEC.' },
  { icon: '📍', titulo: 'Paranavaí',            desc: 'Cidade na fronteira com Argentina e Paraguai, polo turístico e tecnológico com crescente mercado de TI.' },
  { icon: '👩‍🏫', titulo: 'Professores da indústria', desc: 'Docentes com experiência real em empresas de tecnologia e em pesquisa científica aplicada.' },
  { icon: '🔬', titulo: 'Laboratórios modernos',    desc: 'Infraestrutura com computadores, servidores, redes e espaços de inovação para você praticar de verdade.' },
  { icon: '📈', titulo: 'Mercado aquecido',         desc: 'O Brasil tem déficit de 530.000 profissionais de TI. Engenheiros de Software estão entre os mais bem pagos do país.' },
  { icon: '🤝', titulo: 'Extensão e pesquisa',      desc: 'Atividades de extensão curricularizadas, iniciação científica e parcerias com empresas da região.' },
]

const corMap: Record<string, string> = {
  blue:   'border-blue-200  bg-blue-50   text-blue-700',
  cyan:   'border-cyan-200  bg-cyan-50   text-cyan-700',
  green:  'border-green-200 bg-green-50  text-green-700',
  yellow: 'border-amber-200 bg-amber-50  text-amber-700',
  orange: 'border-orange-200 bg-orange-50 text-orange-700',
  purple: 'border-purple-200 bg-purple-50 text-purple-700',
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 mb-2 tracking-tight">{children}</h2>
}
function SectionSubtitle({ children }: { children: React.ReactNode }) {
  return <p className="text-gray-500 mb-8 max-w-2xl">{children}</p>
}

export function CursoPage() {
  return (
    <div className="flex-1 w-full">

      {/* Hero */}
      <section className="bg-gradient-to-b from-blue-50 to-slate-50 px-4 py-20 text-center border-b border-blue-100">
        <span className="inline-block rounded-full bg-blue-100 border border-blue-300 px-3 py-1 text-xs font-semibold text-blue-700 mb-6">
          IFPR — Campus Paranavaí
        </span>
        <h1 className="text-4xl md:text-6xl font-black text-gray-900 tracking-tight leading-tight max-w-3xl mx-auto">
          Engenharia de<br /><span className="text-blue-600">Software</span>
        </h1>
        <p className="mt-6 text-gray-600 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
          O curso que ensina a <strong className="text-gray-900">criar os aplicativos, sistemas e tecnologias</strong>{' '}
          que o mundo usa todo dia — e a fazer isso com qualidade, segurança e impacto real.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3 text-sm">
          {[
            { label: '4 a 7 anos',           sub: 'Integralização · Bacharelado' },
            { label: 'Gratuito',              sub: 'Ensino Federal' },
            { label: '3.208h',                sub: 'Carga horária total' },
            { label: 'Vespertino e Noturno',  sub: '13h30 – 22h50' },
            { label: '40 vagas',              sub: 'Anuais, via SISU' },
          ].map(({ label, sub }) => (
            <div key={label} className="rounded-2xl bg-white border border-gray-200 shadow-sm px-5 py-3 text-center">
              <p className="text-gray-900 font-bold">{label}</p>
              <p className="text-gray-400 text-xs">{sub}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-4 py-16 space-y-24">

        {/* O que é ES */}
        <section>
          <SectionTitle>O que é Engenharia de Software?</SectionTitle>
          <div className="grid gap-6 md:grid-cols-3 mt-8">
            {[
              { icon: '🧩', titulo: 'Não é só programar',  desc: 'Engenharia de Software vai além de escrever código. É pensar em como sistemas funcionam, escalam e se mantêm ao longo do tempo.' },
              { icon: '🏗️', titulo: 'É construir com método', desc: 'Assim como um engenheiro civil projeta um prédio antes de construir, o engenheiro de software planeja, testa e documenta cada etapa.' },
              { icon: '🌍', titulo: 'Tem impacto real',    desc: 'Os sistemas que você aprende a criar podem transformar saúde, educação, transporte e comunicação — para milhões de pessoas.' },
            ].map(c => (
              <div key={c.titulo} className="rounded-2xl border border-gray-200 bg-white shadow-sm p-6">
                <span className="text-4xl">{c.icon}</span>
                <h3 className="text-gray-900 font-bold text-base mt-3 mb-2">{c.titulo}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{c.desc}</p>
              </div>
            ))}
          </div>
          <blockquote className="mt-6 rounded-2xl border-l-4 border-blue-400 bg-blue-50 px-5 py-4">
            <p className="text-gray-700 text-sm leading-relaxed italic">
              "Formar profissionais qualificados para, de maneira sistemática, controlada, eficaz e eficiente, elicitar,
              documentar, projetar, validar, implantar e manter sistemas de software de alta qualidade, que levem em
              consideração questões éticas, sociais, legais e econômicas."
            </p>
            <p className="text-blue-600 text-xs font-semibold mt-2">— Objetivo geral do curso, PPC Engenharia de Software IFPR Paranavaí</p>
          </blockquote>
        </section>

        {/* O que você aprende */}
        <section>
          <SectionTitle>O que você aprende?</SectionTitle>
          <SectionSubtitle>Sem pré-requisito de conhecimento técnico. O curso parte do zero e vai até o nível avançado.</SectionSubtitle>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {aprendizados.map(a => (
              <div key={a.titulo} className="flex gap-4 rounded-2xl border border-gray-200 bg-white shadow-sm p-5">
                <span className="text-3xl flex-shrink-0 leading-none mt-0.5">{a.icon}</span>
                <div>
                  <h3 className="text-gray-900 font-bold text-sm mb-1">{a.titulo}</h3>
                  <p className="text-gray-500 text-xs leading-relaxed">{a.desc}</p>
                  <p className="text-blue-600 text-[10px] font-mono mt-1.5 leading-relaxed">{a.disciplinas}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Áreas */}
        <section>
          <SectionTitle>Onde você pode trabalhar?</SectionTitle>
          <SectionSubtitle>Profissões citadas no projeto pedagógico do curso — mas o mercado para o engenheiro de software vai muito além delas.</SectionSubtitle>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {areas.map(a => (
              <div key={a.titulo} className="rounded-2xl border border-gray-200 bg-white shadow-sm p-5 space-y-2">
                <span className="text-3xl">{a.icon}</span>
                <h3 className="text-gray-900 font-bold text-sm">{a.titulo}</h3>
                <p className="text-xs text-blue-600 font-mono">{a.nicho}</p>
                <p className="text-gray-500 text-xs leading-relaxed">{a.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Projetos */}
        <section>
          <SectionTitle>Exemplos de projetos que você aprende a criar</SectionTitle>
          <SectionSubtitle>Nada de exercícios sem sentido. O curso te prepara para construir coisas que existem no mundo real.</SectionSubtitle>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projetos.map(p => (
              <div key={p.titulo} className="rounded-2xl border border-gray-200 bg-white shadow-sm p-5 space-y-3">
                <span className="text-3xl">{p.icon}</span>
                <div>
                  <h3 className="text-gray-900 font-bold text-sm">{p.titulo}</h3>
                  <p className="text-gray-500 text-xs leading-relaxed mt-1">{p.desc}</p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {p.tags.map(t => <span key={t} className="text-xs rounded-full bg-gray-100 border border-gray-200 px-2 py-0.5 text-gray-600">{t}</span>)}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Tecnologias */}
        <section>
          <SectionTitle>Tecnologias que você vai dominar</SectionTitle>
          <SectionSubtitle>As mesmas ferramentas usadas por Netflix, Google, Nubank e pelas startups mais inovadoras do Brasil.</SectionSubtitle>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {tecnologias.map(t => (
              <div key={t.categoria} className={`rounded-2xl border p-5 ${corMap[t.cor]}`}>
                <h3 className="font-bold text-sm mb-3">{t.categoria}</h3>
                <ul className="space-y-1.5">
                  {t.itens.map(item => (
                    <li key={item} className="text-xs flex items-center gap-2" style={{ color: 'inherit', opacity: 0.85 }}>
                      <span className="w-1 h-1 rounded-full bg-current flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* Grade */}
        <section>
          <SectionTitle>Grade curricular</SectionTitle>
          <SectionSubtitle>
            Regime anual (não semestral): 4 anos organizados em núcleo comum, básico e específico, do fundamento à
            especialização em Engenharia de Software. Matriz curricular oficial do PPC.
          </SectionSubtitle>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {grade.map(p => (
              <div key={p.periodo} className="rounded-2xl border border-gray-200 bg-white shadow-sm p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-bold text-blue-600 uppercase tracking-wide">{p.label}</h3>
                  <span className="text-xs text-gray-400 tabular-nums">{p.ch}h</span>
                </div>
                <ul className="space-y-2">
                  {p.disciplinas.map(d => (
                    <li key={d.nome} className="flex items-start justify-between gap-1 text-xs">
                      <span className="text-gray-700 leading-tight">{d.nome}</span>
                      <span className="text-gray-400 font-mono flex-shrink-0 ml-1">{d.ch}h</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <h3 className="text-sm font-bold text-gray-900 mt-10 mb-4">Além da grade: o que mais compõe o curso</h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {componentesAdicionais.map(c => (
              <div key={c.titulo} className="flex gap-3 rounded-2xl border border-gray-200 bg-gray-50 p-4">
                <span className="text-2xl flex-shrink-0 leading-none">{c.icon}</span>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-gray-900 font-bold text-xs">{c.titulo}</h4>
                    {c.chRelogio && <span className="text-[10px] text-gray-400 font-mono">{c.chRelogio}h-relógio</span>}
                  </div>
                  <p className="text-gray-500 text-xs leading-relaxed mt-1">{c.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="text-gray-400 text-xs mt-4">
            Carga horária total do curso: <strong className="text-gray-600">3.208 horas-relógio</strong>, somando os
            quatro anos de componentes obrigatórios, estágio, atividades complementares, extensão e optativas.
          </p>
        </section>

        {/* Por que IFPR */}
        <section className="rounded-3xl border border-green-200 bg-green-50 px-6 py-12">
          <div className="text-center mb-10">
            <SectionTitle>Por que estudar Engenharia de Software no IFPR?</SectionTitle>
            <p className="text-gray-500 max-w-xl mx-auto">
              Porque aqui você encontra qualidade de instituição federal, estrutura moderna e uma cidade que cresce no setor de tecnologia.
            </p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {porqueIFPR.map(p => (
              <div key={p.titulo} className="flex gap-4">
                <span className="text-3xl flex-shrink-0">{p.icon}</span>
                <div>
                  <h3 className="text-gray-900 font-bold text-sm">{p.titulo}</h3>
                  <p className="text-gray-600 text-xs leading-relaxed mt-1">{p.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-12 text-center border-t border-green-200 pt-10">
            <p className="text-gray-900 font-bold text-lg mb-1">Ficou interessado?</p>
            <p className="text-gray-500 text-sm mb-6">40 vagas anuais pelo SISU (nota do ENEM). Acompanhe as datas no site do IFPR.</p>
            <div className="flex flex-wrap justify-center gap-3">
              <a href="https://ifpr.edu.br/paranavai/" target="_blank" rel="noopener noreferrer"
                className="rounded-xl bg-green-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-green-700 transition-colors shadow-sm">
                Site do IFPR Paranavaí ↗
              </a>
              <a href="https://sisu.mec.gov.br" target="_blank" rel="noopener noreferrer"
                className="rounded-xl border border-gray-300 bg-white px-6 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors shadow-sm">
                Informações sobre o SISU ↗
              </a>
            </div>
          </div>
        </section>

      </div>
    </div>
  )
}
