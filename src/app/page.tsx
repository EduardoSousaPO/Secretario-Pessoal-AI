/**
 * Pagina inicial do AI Secretary
 * 
 * Esta pagina e apenas informativa.
 * O sistema opera via webhook do Telegram.
 */

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      <div className="container mx-auto px-4 py-16 max-w-3xl">
        <header className="text-center mb-16">
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
            AI Secretary
          </h1>
          <p className="text-xl text-slate-400">
            Voice to Task Automation
          </p>
        </header>

        <section className="bg-slate-800/50 rounded-2xl p-8 mb-8 border border-slate-700">
          <h2 className="text-2xl font-semibold mb-4 text-blue-400">Como funciona</h2>
          <ol className="space-y-4 text-slate-300">
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold">1</span>
              <span>Envie um audio no Telegram com seu comando de voz</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold">2</span>
              <span>A IA transcreve e interpreta sua intencao automaticamente</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-8 h-8 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center font-bold">3</span>
              <span>Suas tarefas sao criadas/atualizadas no Notion</span>
            </li>
          </ol>
        </section>

        <section className="bg-slate-800/50 rounded-2xl p-8 mb-8 border border-slate-700">
          <h2 className="text-2xl font-semibold mb-4 text-purple-400">Comandos suportados</h2>
          <ul className="space-y-3 text-slate-300">
            <li className="flex items-center gap-2">
              <span className="text-green-400">→</span>
              <code className="bg-slate-700 px-2 py-1 rounded text-sm">criar tarefa pagar conta de luz amanha</code>
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-400">→</span>
              <code className="bg-slate-700 px-2 py-1 rounded text-sm">marcar tarefa X como concluida</code>
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-400">→</span>
              <code className="bg-slate-700 px-2 py-1 rounded text-sm">atualizar tarefa Y para urgente</code>
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-400">→</span>
              <code className="bg-slate-700 px-2 py-1 rounded text-sm">minhas tarefas pendentes</code>
            </li>
          </ul>
        </section>

        <section className="bg-slate-800/50 rounded-2xl p-8 border border-slate-700">
          <h2 className="text-2xl font-semibold mb-4 text-green-400">Stack</h2>
          <div className="grid grid-cols-2 gap-4 text-slate-300">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-blue-500"></span>
              <span>Vercel (Backend)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-green-500"></span>
              <span>Supabase (Database)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-purple-500"></span>
              <span>OpenAI (AI)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-orange-500"></span>
              <span>Notion (Tasks)</span>
            </div>
          </div>
        </section>

        <footer className="text-center mt-16 text-slate-500 text-sm">
          <p>Sistema operando 24/7 na nuvem</p>
          <p className="mt-2">v0.2.0 - Cloud-First Architecture</p>
        </footer>
      </div>
    </main>
  )
}
