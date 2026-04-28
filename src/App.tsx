import { useMemo, useState } from "react";
import {
  fallbackModelOrder,
  generatedArtifacts,
  generateBootstrapScript,
  githubSecrets,
  type GeneratorConfig,
} from "./lib/generateBootstrapScript";

const deliveryFlow = [
  {
    title: "1. Автоустановка toolchain",
    text: "Скрипт сам проверяет Xcode CLT, Homebrew, GitHub CLI и Node.js. То есть ручная установка Node не нужна, но технически без него Electron не собрать вообще.",
  },
  {
    title: "2. Создание репозитория",
    text: "Дальше он поднимает локальный Electron + React + Vite проект, патчит package.json и добавляет документацию по Gemini-интеграции.",
  },
  {
    title: "3. Подготовка CI",
    text: "В репозиторий кладётся GitHub Actions workflow, который собирает отдельные DMG для Intel и Apple Silicon, а также universal-артефакт.",
  },
  {
    title: "4. Пуш в GitHub",
    text: "После bootstrap скрипт сам делает commit, создаёт репозиторий через gh и пушит код в нужную ветку.",
  },
  {
    title: "5. Артефакты релиза",
    text: "По тегу v* workflow выкладывает DMG и ZIP в GitHub Release. Это удобно как для Intel, так и для ARM-маков.",
  },
  {
    title: "6. Дальнейшая доработка",
    text: "Внутри репо уже будут спецификация, notes по Gemini models/list endpoint, fallback-стратегия и инструкции по signing/notarization.",
  },
];

const honestLimits = [
  "Electron-приложение и DMG физически невозможно собрать без Node/npm, поэтому генератор не просит ставить это вручную, а ставит сам при необходимости.",
  "Публичный Gemini API умеет листать модели, но не даёт простой стабильной ручки 'покажи точный остаток бесплатного лимита по каждой модели'. Поэтому реалистичный путь — probe-запросы + fallback по ошибкам.",
  "Полностью 'чистый' notarized DMG для macOS требует Apple Developer credentials и сертификат. Без них можно собрать unsigned DMG, но Gatekeeper будет ругаться.",
];

const repoTree = [
  ".github/workflows/release.yml",
  "electron-builder.yml",
  "build/entitlements.mac.plist",
  "build/entitlements.mac.inherit.plist",
  "docs/SPEC.md",
  "docs/GEMINI_NOTES.md",
  "docs/ARCHITECTURE.md",
  "docs/GITHUB_SECRETS.md",
  ".env.example",
  "README.md",
];

const references = [
  {
    title: "Gemini API — list models",
    note: "Официальный REST endpoint: GET /v1beta/models.",
  },
  {
    title: "Gemini API — rate limits / tiers",
    note: "Free / Tier 1 / Tier 2 / Tier 3 привязаны к проекту, а не к конкретному ключу.",
  },
  {
    title: "Gemini API — pricing",
    note: "У Google есть free tier только для части моделей, и это меняется по семействам моделей.",
  },
  {
    title: "electron-builder — mac targets",
    note: "Universal arch, entitlements и notarization настраиваются отдельно от обычного unsigned DMG.",
  },
  {
    title: "GitHub-hosted runners",
    note: "Для ARM и Intel macOS лучше использовать разные runner labels, а universal собирать отдельным шагом.",
  },
];

const initialConfig: GeneratorConfig = {
  githubOwner: "your-github-user",
  repoName: "floorplan-ai-electron",
  appName: "Floorplan AI Studio",
  bundleId: "com.yourcompany.floorplanai",
  branch: "main",
  visibility: "private",
  includeSigningNotes: true,
};

function FieldLabel({ children }: { children: string }) {
  return <label className="mb-2 block text-sm font-medium text-slate-200">{children}</label>;
}

function InfoCard({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-[0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-sm">
      <h3 className="text-base font-semibold text-white">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-300">{text}</p>
    </div>
  );
}

function SectionTitle({ eyebrow, title, text }: { eyebrow: string; title: string; text: string }) {
  return (
    <div className="space-y-3">
      <div className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-300/80">{eyebrow}</div>
      <h2 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">{title}</h2>
      <p className="max-w-3xl text-sm leading-7 text-slate-300 sm:text-base">{text}</p>
    </div>
  );
}

export default function App() {
  const [config, setConfig] = useState<GeneratorConfig>(initialConfig);
  const [copied, setCopied] = useState(false);

  const script = useMemo(() => generateBootstrapScript(config), [config]);
  const scriptLineCount = useMemo(() => script.split("\n").length, [script]);
  const repoUrl = `https://github.com/${config.githubOwner || "your-github-user"}/${config.repoName || "floorplan-ai-electron"}`;

  const update = <K extends keyof GeneratorConfig>(key: K, value: GeneratorConfig[K]) => {
    setConfig((current) => ({ ...current, [key]: value }));
  };

  const copyScript = async () => {
    await navigator.clipboard.writeText(script);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  const downloadScript = () => {
    const blob = new Blob([script], { type: "text/x-shellscript;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${config.repoName || "floorplan-ai-electron"}-bootstrap.sh`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.18),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(168,85,247,0.18),_transparent_32%),linear-gradient(180deg,_#020617_0%,_#020617_38%,_#0f172a_100%)] text-slate-100">
      <div className="mx-auto max-w-7xl px-4 pb-16 pt-8 sm:px-6 lg:px-8 lg:pb-24 lg:pt-12">
        <header className="rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-2xl shadow-cyan-950/20 backdrop-blur-sm sm:p-8 lg:p-10">
          <div className="flex flex-wrap gap-3">
            <span className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-cyan-200">
              macOS bootstrap
            </span>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-slate-300">
              Electron + React + Vite
            </span>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-slate-300">
              DMG x64 / arm64 / universal
            </span>
          </div>

          <div className="mt-6 grid gap-10 lg:grid-cols-[1.3fr_0.9fr] lg:items-start">
            <div className="space-y-6">
              <div className="space-y-4">
                <h1 className="max-w-4xl text-4xl font-semibold tracking-tight text-white sm:text-5xl lg:text-6xl">
                  Генератор честного bootstrap-скрипта для Electron-приложения с Gemini и сборкой DMG под Mac.
                </h1>
                <p className="max-w-3xl text-base leading-8 text-slate-300 sm:text-lg">
                  Ты просил скрипт, который можно вставить в терминал на macOS и который сам создаст GitHub-репозиторий,
                  поднимет каркас Electron-приложения, добавит GitHub Actions и подготовит релизы под Intel и ARM. Я сделал
                  именно такой генератор — но без фейковых обещаний про "магически готовый notarized DMG без Node и Apple
                  credentials".
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <InfoCard title="Автоустановка" text="Скрипт сам проверяет Homebrew, Node.js, GitHub CLI и Xcode CLT. Ручных пререквизитов минимум." />
                <InfoCard title="GitHub и CI" text="Добавляется workflow для сборки unsigned DMG артефактов: Intel, Apple Silicon и universal-вариант." />
                <InfoCard title="Gemini notes" text="В репо кладутся docs по list-models endpoint, fallback-порядку моделей и честным ограничениям free tier." />
              </div>
            </div>

            <div className="rounded-[1.75rem] border border-white/10 bg-slate-950/60 p-5 shadow-xl shadow-black/30">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-white">Что получится на выходе</div>
                  <div className="mt-1 text-sm text-slate-400">Артефакты и инфраструктура, которые реально можно собрать.</div>
                </div>
                <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-right">
                  <div className="text-lg font-semibold text-emerald-200">{scriptLineCount}</div>
                  <div className="text-[11px] uppercase tracking-[0.2em] text-emerald-100/80">lines</div>
                </div>
              </div>

              <div className="mt-5 space-y-3">
                {generatedArtifacts.map((artifact) => (
                  <div
                    key={artifact}
                    className="flex items-start gap-3 rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm text-slate-300"
                  >
                    <div className="mt-1 h-2.5 w-2.5 rounded-full bg-cyan-300" />
                    <div>{artifact}</div>
                  </div>
                ))}
              </div>

              <div className="mt-5 rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4 text-sm leading-6 text-amber-50/90">
                <strong className="font-semibold text-amber-200">Важно:</strong> по умолчанию генератор готовит unsigned
                DMG. Для нормального production-distribution без предупреждений Gatekeeper позже понадобятся Apple signing
                secrets.
              </div>
            </div>
          </div>
        </header>

        <main className="mt-10 space-y-16">
          <section className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6 backdrop-blur-sm sm:p-8">
              <SectionTitle
                eyebrow="Параметры"
                title="Настрой будущий репозиторий"
                text="Измени имя приложения, owner репозитория, bundle id и тип приватности. Скрипт сразу подстроится под твои значения."
              />

              <div className="mt-8 grid gap-5">
                <div>
                  <FieldLabel>GitHub owner</FieldLabel>
                  <input
                    value={config.githubOwner}
                    onChange={(event) => update("githubOwner", event.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300/60 focus:ring-2 focus:ring-cyan-300/20"
                    placeholder="your-github-user"
                  />
                </div>
                <div>
                  <FieldLabel>Repo name</FieldLabel>
                  <input
                    value={config.repoName}
                    onChange={(event) => update("repoName", event.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300/60 focus:ring-2 focus:ring-cyan-300/20"
                    placeholder="floorplan-ai-electron"
                  />
                </div>
                <div>
                  <FieldLabel>App name</FieldLabel>
                  <input
                    value={config.appName}
                    onChange={(event) => update("appName", event.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300/60 focus:ring-2 focus:ring-cyan-300/20"
                    placeholder="Floorplan AI Studio"
                  />
                </div>
                <div>
                  <FieldLabel>Bundle ID</FieldLabel>
                  <input
                    value={config.bundleId}
                    onChange={(event) => update("bundleId", event.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300/60 focus:ring-2 focus:ring-cyan-300/20"
                    placeholder="com.yourcompany.floorplanai"
                  />
                </div>
                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <FieldLabel>Default branch</FieldLabel>
                    <input
                      value={config.branch}
                      onChange={(event) => update("branch", event.target.value)}
                      className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300/60 focus:ring-2 focus:ring-cyan-300/20"
                      placeholder="main"
                    />
                  </div>
                  <div>
                    <FieldLabel>Repository visibility</FieldLabel>
                    <div className="grid grid-cols-2 rounded-2xl border border-white/10 bg-slate-950/70 p-1">
                      {(["private", "public"] as const).map((mode) => {
                        const active = config.visibility === mode;
                        return (
                          <button
                            key={mode}
                            type="button"
                            onClick={() => update("visibility", mode)}
                            className={`rounded-[1rem] px-3 py-2 text-sm font-medium transition ${
                              active
                                ? "bg-cyan-400 text-slate-950"
                                : "text-slate-300 hover:bg-white/5 hover:text-white"
                            }`}
                          >
                            {mode}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <label className="flex items-start gap-3 rounded-2xl border border-white/10 bg-slate-950/40 p-4 text-sm text-slate-300">
                  <input
                    type="checkbox"
                    checked={config.includeSigningNotes}
                    onChange={(event) => update("includeSigningNotes", event.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-white/20 bg-slate-900 text-cyan-300"
                  />
                  <span>
                    Добавить расширенные notes по signing / notarization. Полезно, если потом захочешь перейти от unsigned DMG к
                    полноценному distribution flow.
                  </span>
                </label>
              </div>

              <div className="mt-8 rounded-3xl border border-white/10 bg-slate-950/50 p-5 text-sm leading-7 text-slate-300">
                <div className="font-semibold text-white">Итоговый GitHub URL</div>
                <div className="mt-2 break-all text-cyan-200">{repoUrl}</div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="rounded-[2rem] border border-red-400/20 bg-red-400/10 p-6 backdrop-blur-sm sm:p-8">
                <SectionTitle
                  eyebrow="Честные ограничения"
                  title="Что нельзя обещать пользователю без оговорок"
                  text="Вместо красивой сказки я сразу заложил в интерфейс реалистичные технические ограничения — именно они определяют, насколько жизнеспособен такой bootstrap."
                />
                <div className="mt-6 space-y-4">
                  {honestLimits.map((item) => (
                    <div key={item} className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm leading-7 text-slate-100/90">
                      {item}
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6 backdrop-blur-sm sm:p-8">
                <SectionTitle
                  eyebrow="Gemini fallback"
                  title="Какие модели стоит пробовать первыми"
                  text="Bootstrap закладывает приоритетный порядок моделей и советует переключаться на следующую при quota / 429 / 5xx ошибках."
                />

                <div className="mt-6 grid gap-3">
                  {fallbackModelOrder.map((model, index) => (
                    <div key={model} className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3">
                      <div>
                        <div className="text-sm font-semibold text-white">{model}</div>
                        <div className="text-xs text-slate-400">Fallback step #{index + 1}</div>
                      </div>
                      <div className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs font-medium text-cyan-200">
                        probe then failover
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4 text-sm leading-6 text-amber-50/90">
                  Остаток free-tier лимита по модели лучше трактовать как <em>эвристику</em>, а не как точное число: list-models можно
                  получить, а точный remaining quota публично и стабильно не вытащить одной простой ручкой.
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-[2rem] border border-white/10 bg-white/5 p-6 backdrop-blur-sm sm:p-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <SectionTitle
                eyebrow="Скрипт"
                title="Готовый bash-скрипт для вставки в Terminal"
                text="Ниже — большой самодостаточный bootstrap. Его можно скопировать целиком, сохранить в .sh или подправить пару переменных сверху и запустить на macOS."
              />
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={copyScript}
                  className="rounded-2xl bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
                >
                  {copied ? "Скопировано" : "Скопировать скрипт"}
                </button>
                <button
                  type="button"
                  onClick={downloadScript}
                  className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  Скачать .sh
                </button>
              </div>
            </div>

            <div className="mt-6 overflow-hidden rounded-[1.5rem] border border-white/10 bg-slate-950/80 shadow-2xl shadow-black/30">
              <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 text-xs uppercase tracking-[0.2em] text-slate-400">
                <span>{config.repoName || "floorplan-ai-electron"}-bootstrap.sh</span>
                <span>{scriptLineCount} lines</span>
              </div>
              <pre className="max-h-[780px] overflow-auto p-4 text-[12px] leading-6 text-slate-200 sm:p-6 sm:text-[13px]">
                <code>{script}</code>
              </pre>
            </div>
          </section>

          <section className="grid gap-8 xl:grid-cols-[1.05fr_0.95fr]">
            <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6 backdrop-blur-sm sm:p-8">
              <SectionTitle
                eyebrow="Что делает bootstrap"
                title="Пошаговый delivery flow"
                text="Это не просто пустой `npm create` — генератор закладывает практический сценарий от локального bootstrap до GitHub Release с DMG-артефактами."
              />

              <div className="mt-8 space-y-4">
                {deliveryFlow.map((step) => (
                  <div key={step.title} className="rounded-3xl border border-white/10 bg-slate-950/45 p-5">
                    <div className="text-base font-semibold text-white">{step.title}</div>
                    <p className="mt-2 text-sm leading-7 text-slate-300">{step.text}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-8">
              <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6 backdrop-blur-sm sm:p-8">
                <SectionTitle
                  eyebrow="Файлы"
                  title="Что появится в репозитории"
                  text="Явно показываю ядро инфраструктуры, которое скрипт создаёт сам: release workflow, entitlements, спецификацию и docs по Gemini."
                />

                <div className="mt-6 rounded-[1.5rem] border border-white/10 bg-slate-950/60 p-4 font-mono text-sm leading-7 text-slate-200">
                  {repoTree.map((item) => (
                    <div key={item}>{item}</div>
                  ))}
                </div>
              </div>

              <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6 backdrop-blur-sm sm:p-8">
                <SectionTitle
                  eyebrow="GitHub secrets"
                  title="Что понадобится для signed / notarized DMG"
                  text="Unsigned сборки можно получить сразу. Подписанные production-артефакты требуют Apple credentials и сертификаты."
                />

                <div className="mt-6 overflow-hidden rounded-[1.5rem] border border-white/10">
                  <div className="grid grid-cols-[1.1fr_0.8fr_2fr] gap-4 bg-white/10 px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">
                    <div>Secret</div>
                    <div>Обязателен</div>
                    <div>Назначение</div>
                  </div>
                  <div className="divide-y divide-white/10 bg-slate-950/40">
                    {githubSecrets.map((secret) => (
                      <div key={secret.name} className="grid grid-cols-[1.1fr_0.8fr_2fr] gap-4 px-4 py-4 text-sm leading-6 text-slate-300">
                        <div className="font-mono text-cyan-200">{secret.name}</div>
                        <div>{secret.required}</div>
                        <div>{secret.description}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-[2rem] border border-white/10 bg-white/5 p-6 backdrop-blur-sm sm:p-8">
            <SectionTitle
              eyebrow="Документация"
              title="На какие официальные вещи опирается эта схема"
              text="Я заложил в интерфейс не догадки, а структуру, которая опирается на публичную документацию Gemini API, electron-builder и GitHub Actions."
            />

            <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {references.map((item) => (
                <div key={item.title} className="rounded-3xl border border-white/10 bg-slate-950/45 p-5">
                  <div className="text-base font-semibold text-white">{item.title}</div>
                  <p className="mt-2 text-sm leading-7 text-slate-300">{item.note}</p>
                </div>
              ))}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
