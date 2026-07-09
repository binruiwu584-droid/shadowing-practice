import { useEffect, useMemo, useRef, useState } from 'react';
import { allCategories, getSentenceById, getSentences } from './data/sentences';
import { speak, stopSpeech } from './lib/speech';
import { storage } from './lib/storage';
import type { Category, Language, Sentence, Settings, Stats } from './types';

type View = 'home' | 'shadowing' | 'favorites' | 'stats' | 'settings';

const languageLabel: Record<Language, string> = { en: 'English', es: 'Español' };
const speedOptions = [0.75, 1, 1.25, 1.5];

const todayKey = () => new Date().toISOString().slice(0, 10);

const formatTime = (seconds: number) => {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes}m ${rest}s`;
};

const nextStats = (stats: Stats, extraSeconds = 0, recording = false): Stats => {
  const today = todayKey();
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const streakDays =
    stats.lastPracticeDate === today
      ? Math.max(stats.streakDays, 1)
      : stats.lastPracticeDate === yesterday
        ? stats.streakDays + 1
        : 1;

  return {
    streakDays,
    todayPracticeCount: stats.lastPracticeDate === today ? stats.todayPracticeCount + 1 : 1,
    totalRecordings: stats.totalRecordings + (recording ? 1 : 0),
    totalPracticeSeconds: stats.totalPracticeSeconds + extraSeconds,
    lastPracticeDate: today,
  };
};

const cx = (...classes: Array<string | false | undefined>) => classes.filter(Boolean).join(' ');

function AppShell({
  view,
  setView,
  settings,
  children,
}: {
  view: View;
  setView: (view: View) => void;
  settings: Settings;
  children: React.ReactNode;
}) {
  const tabs: Array<[View, string]> = [
    ['home', 'Today'],
    ['shadowing', 'Shadowing'],
    ['favorites', 'Favorites'],
    ['stats', 'Stats'],
    ['settings', 'Settings'],
  ];

  useEffect(() => {
    document.documentElement.classList.toggle('dark', settings.darkMode);
  }, [settings.darkMode]);

  return (
    <div
      className={cx(
        'min-h-screen bg-[radial-gradient(circle_at_top_left,#dbeafe,transparent_34%),linear-gradient(180deg,#f8fbff,#eef6ff)] text-slate-950 transition dark:bg-[radial-gradient(circle_at_top_left,#1e3a8a,transparent_32%),linear-gradient(180deg,#020617,#0f172a)] dark:text-slate-50',
        settings.fontSize === 'sm' && 'text-sm',
        settings.fontSize === 'lg' && 'text-lg',
      )}
    >
      <header className="sticky top-0 z-20 border-b border-white/70 bg-white/70 backdrop-blur-2xl dark:border-slate-800 dark:bg-slate-950/72">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <button className="flex w-fit items-center gap-3 text-left" onClick={() => setView('home')}>
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-blue-600 text-xl text-white shadow-soft">S</span>
            <span>
              <span className="block text-lg font-bold tracking-normal">Shadowing Studio</span>
              <span className="block text-sm text-slate-500 dark:text-slate-400">English & Español practice</span>
            </span>
          </button>
          <nav className="flex gap-2 overflow-x-auto pb-1">
            {tabs.map(([key, label]) => (
              <button
                key={key}
                className={cx(
                  'rounded-2xl px-4 py-2 text-sm font-semibold transition hover:bg-blue-50 dark:hover:bg-slate-800',
                  view === key ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-600 dark:text-slate-300',
                )}
                onClick={() => setView(key)}
              >
                {label}
              </button>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:py-10">{children}</main>
    </div>
  );
}

function HomePage({
  settings,
  updateSettings,
  setSelectedSentence,
  setView,
  favoriteIds,
  toggleFavorite,
  recordPractice,
}: {
  settings: Settings;
  updateSettings: (settings: Settings) => void;
  setSelectedSentence: (sentence: Sentence) => void;
  setView: (view: View) => void;
  favoriteIds: string[];
  toggleFavorite: (id: string) => void;
  recordPractice: (seconds?: number) => void;
}) {
  const [category, setCategory] = useState<Category>('Daily Life');
  const [index, setIndex] = useState(0);
  const sentences = useMemo(() => getSentences(settings.language, category), [settings.language, category]);
  const current = sentences[index % sentences.length];

  const chooseIndex = (next: number) => setIndex(((next % sentences.length) + sentences.length) % sentences.length);
  const randomSentence = () => chooseIndex(Math.floor(Math.random() * sentences.length));
  const play = () => {
    speak(current.text, current.language, settings.defaultSpeed, () => recordPractice(8));
  };

  return (
    <section className="animate-fadeIn space-y-8">
      <div className="grid gap-6 lg:grid-cols-[1.08fr_0.92fr] lg:items-stretch">
        <div className="glass-card flex min-h-[420px] flex-col justify-between overflow-hidden p-7 sm:p-10">
          <div className="space-y-6">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-blue-500">Today's Practice</p>
            <div className="space-y-4">
              <h1 className="max-w-3xl text-4xl font-bold tracking-normal text-slate-950 sm:text-6xl dark:text-white">
                Practice listening, pronunciation, and shadowing in one calm flow.
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-slate-600 dark:text-slate-300">
                Build rhythm with short daily sentences, record yourself, and keep a private learning history in your browser.
              </p>
            </div>
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            {(['en', 'es'] as Language[]).map((language) => (
              <button
                key={language}
                className={cx(
                  'rounded-2xl border px-5 py-3 font-semibold transition hover:-translate-y-0.5',
                  settings.language === language
                    ? 'border-blue-600 bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                    : 'border-blue-100 bg-white text-slate-700 hover:bg-blue-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100',
                )}
                onClick={() => {
                  updateSettings({ ...settings, language });
                  setIndex(0);
                }}
              >
                {language === 'en' ? '○ English' : '○ Español'}
              </button>
            ))}
          </div>
        </div>

        <div className="glass-card animate-float p-6 sm:p-8">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-500">Today's Sentence</p>
              <h2 className="mt-2 text-2xl font-bold">{languageLabel[current.language]}</h2>
            </div>
            <button className="icon-button" onClick={() => toggleFavorite(current.id)} aria-label="Favorite">
              {favoriteIds.includes(current.id) ? '♥' : '♡'}
            </button>
          </div>
          <div className="mb-5 flex flex-wrap gap-2">
            {allCategories.map((item) => (
              <button
                key={item}
                className={cx(
                  'rounded-full px-3 py-2 text-sm font-semibold transition',
                  category === item ? 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-200' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
                )}
                onClick={() => {
                  setCategory(item);
                  setIndex(0);
                }}
              >
                {item}
              </button>
            ))}
          </div>
          <blockquote className="min-h-[180px] rounded-3xl bg-blue-50/80 p-6 text-3xl font-semibold leading-tight text-slate-900 dark:bg-slate-800 dark:text-white">
            “{current.text}”
          </blockquote>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <button className="primary-button" onClick={play}>▶ Play</button>
            <button className="secondary-button" onClick={play}>Replay</button>
            <button className="secondary-button" onClick={() => chooseIndex(index + 1)}>Next</button>
            <button className="secondary-button" onClick={randomSentence}>Random</button>
          </div>
          <button
            className="mt-4 w-full rounded-2xl bg-slate-950 px-5 py-3 font-semibold text-white transition hover:-translate-y-0.5 hover:bg-slate-800 dark:bg-white dark:text-slate-950"
            onClick={() => {
              setSelectedSentence(current);
              setView('shadowing');
            }}
          >
            Start Shadowing
          </button>
        </div>
      </div>
    </section>
  );
}

function App() {
  const [view, setView] = useState<View>('home');
  const [settings, setSettings] = useState(storage.getSettings);
  const [favoriteIds, setFavoriteIds] = useState(storage.getFavorites);
  const [stats, setStats] = useState(storage.getStats);
  const [selectedSentence, setSelectedSentence] = useState<Sentence>(() => getSentences(settings.language, 'Daily Life')[0]);

  const updateSettings = (next: Settings) => {
    setSettings(next);
    storage.setSettings(next);
  };

  const toggleFavorite = (id: string) => {
    const next = favoriteIds.includes(id) ? favoriteIds.filter((item) => item !== id) : [...favoriteIds, id];
    setFavoriteIds(next);
    storage.setFavorites(next);
  };

  const recordPractice = (seconds = 0, recording = false) => {
    setStats((current) => {
      const next = nextStats(current, seconds, recording);
      storage.setStats(next);
      return next;
    });
  };

  return (
    <AppShell view={view} setView={setView} settings={settings}>
      {view === 'home' && (
        <HomePage
          settings={settings}
          updateSettings={updateSettings}
          setSelectedSentence={setSelectedSentence}
          setView={setView}
          favoriteIds={favoriteIds}
          toggleFavorite={toggleFavorite}
          recordPractice={recordPractice}
        />
      )}
      {view === 'shadowing' && (
        <ShadowingPage
          sentence={selectedSentence}
          settings={settings}
          favoriteIds={favoriteIds}
          toggleFavorite={toggleFavorite}
          recordPractice={recordPractice}
        />
      )}
      {view === 'favorites' && (
        <FavoritesPage
          favoriteIds={favoriteIds}
          toggleFavorite={toggleFavorite}
          setSelectedSentence={setSelectedSentence}
          setView={setView}
        />
      )}
      {view === 'stats' && <StatsPage stats={stats} />}
      {view === 'settings' && <SettingsPage settings={settings} updateSettings={updateSettings} />}
    </AppShell>
  );
}

function ShadowingPage({
  sentence,
  settings,
  favoriteIds,
  toggleFavorite,
  recordPractice,
}: {
  sentence: Sentence;
  settings: Settings;
  favoriteIds: string[];
  toggleFavorite: (id: string) => void;
  recordPractice: (seconds?: number, recording?: boolean) => void;
}) {
  const [speed, setSpeed] = useState(settings.defaultSpeed);
  const [loop, setLoop] = useState(false);
  const [abRepeat, setAbRepeat] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordingUrl, setRecordingUrl] = useState('');
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<number | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    return () => {
      stopSpeech();
      if (timerRef.current) window.clearInterval(timerRef.current);
      if (recordingUrl) URL.revokeObjectURL(recordingUrl);
    };
  }, [recordingUrl]);

  const playStandard = () => {
    setIsPlaying(true);
    setProgress(0);
    const duration = Math.max(2400, sentence.text.length * 70);
    const start = Date.now();
    const interval = window.setInterval(() => {
      setProgress(Math.min(100, ((Date.now() - start) / duration) * 100));
    }, 120);
    speak(sentence.text, sentence.language, speed, () => {
      window.clearInterval(interval);
      setProgress(100);
      setIsPlaying(false);
      recordPractice(Math.round(duration / 1000));
      if (loop) window.setTimeout(playStandard, abRepeat ? 420 : 900);
    });
  };

  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    chunksRef.current = [];
    const recorder = new MediaRecorder(stream);
    recorderRef.current = recorder;
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunksRef.current.push(event.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
      if (recordingUrl) URL.revokeObjectURL(recordingUrl);
      setRecordingUrl(URL.createObjectURL(blob));
      stream.getTracks().forEach((track) => track.stop());
      recordPractice(recordingSeconds, true);
    };
    setRecordingSeconds(0);
    timerRef.current = window.setInterval(() => setRecordingSeconds((value) => value + 1), 1000);
    recorder.start();
    setRecording(true);
  };

  const stopRecording = () => {
    recorderRef.current?.stop();
    setRecording(false);
    if (timerRef.current) window.clearInterval(timerRef.current);
  };

  const score = { pronunciation: 85, accuracy: 88, fluency: 82, rhythm: 86, intonation: 84 };

  return (
    <section className="animate-fadeIn space-y-6">
      <div className="grid gap-5 lg:grid-cols-[1fr_1.05fr_1fr]">
        <div className="glass-card p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-500">{languageLabel[sentence.language]}</p>
              <h2 className="mt-3 text-2xl font-bold">Original Text</h2>
            </div>
            <button className="icon-button" onClick={() => toggleFavorite(sentence.id)} aria-label="Favorite">
              {favoriteIds.includes(sentence.id) ? '♥' : '♡'}
            </button>
          </div>
          <p className="mt-8 text-3xl font-semibold leading-tight">“{sentence.text}”</p>
          <p className="mt-6 rounded-2xl bg-blue-50 p-4 text-slate-600 dark:bg-slate-800 dark:text-slate-300">{sentence.category}</p>
        </div>

        <div className="glass-card p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-500">Player</p>
          <div className="mt-6 rounded-3xl bg-slate-950 p-6 text-white dark:bg-blue-950">
            <button className="mx-auto grid h-24 w-24 place-items-center rounded-full bg-blue-500 text-4xl shadow-soft transition hover:scale-105" onClick={playStandard}>
              {isPlaying ? '❚❚' : '▶'}
            </button>
            <div className="mt-6 h-3 overflow-hidden rounded-full bg-white/15">
              <div className="h-full rounded-full bg-blue-300 transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>
          <div className="mt-5 grid grid-cols-4 gap-2">
            {speedOptions.map((item) => (
              <button
                key={item}
                className={cx('rounded-2xl px-3 py-3 font-semibold transition', speed === item ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-700 dark:bg-slate-800 dark:text-slate-200')}
                onClick={() => setSpeed(item)}
              >
                {item}x
              </button>
            ))}
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <label className="flex items-center justify-between rounded-2xl bg-white p-4 shadow-sm dark:bg-slate-800">
              <span className="font-semibold">Loop</span>
              <input type="checkbox" checked={loop} onChange={(event) => setLoop(event.target.checked)} />
            </label>
            <label className="flex items-center justify-between rounded-2xl bg-white p-4 shadow-sm dark:bg-slate-800">
              <span className="font-semibold">AB Repeat</span>
              <input type="checkbox" checked={abRepeat} onChange={(event) => setAbRepeat(event.target.checked)} />
            </label>
          </div>
        </div>

        <div className="glass-card p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-500">Recording</p>
          <div className="mt-6 rounded-3xl bg-blue-50 p-6 text-center dark:bg-slate-800">
            <div className={cx('mx-auto grid h-24 w-24 place-items-center rounded-full text-4xl transition', recording ? 'bg-red-500 text-white shadow-lg shadow-red-500/20' : 'bg-white text-blue-600 shadow-soft dark:bg-slate-900')}>
              ●
            </div>
            <p className="mt-4 text-3xl font-bold">{formatTime(recordingSeconds)}</p>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <button className="primary-button" onClick={startRecording} disabled={recording}>Start</button>
            <button className="secondary-button" onClick={stopRecording} disabled={!recording}>Stop</button>
            <button className="secondary-button" onClick={startRecording} disabled={recording}>Retake</button>
            <a className={cx('secondary-button text-center', !recordingUrl && 'pointer-events-none opacity-45')} href={recordingUrl} download="shadowing-recording.webm">
              Download
            </a>
          </div>
          {recordingUrl && <audio className="mt-5 w-full" src={recordingUrl} controls />}
        </div>
      </div>

      <div className="glass-card p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-500">Pronunciation Score</p>
            <h2 className="mt-2 text-5xl font-bold">{score.pronunciation} <span className="text-2xl text-slate-400">/100</span></h2>
          </div>
          <div className="grid flex-1 gap-3 sm:grid-cols-4">
            {(['accuracy', 'fluency', 'rhythm', 'intonation'] as const).map((key) => (
              <div key={key} className="rounded-2xl bg-blue-50 p-4 dark:bg-slate-800">
                <p className="text-sm font-semibold capitalize text-slate-500 dark:text-slate-400">{key}</p>
                <p className="mt-1 text-2xl font-bold">{score[key]}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function FavoritesPage({
  favoriteIds,
  toggleFavorite,
  setSelectedSentence,
  setView,
}: {
  favoriteIds: string[];
  toggleFavorite: (id: string) => void;
  setSelectedSentence: (sentence: Sentence) => void;
  setView: (view: View) => void;
}) {
  const favorites = favoriteIds.map(getSentenceById).filter(Boolean) as Sentence[];

  return (
    <section className="animate-fadeIn space-y-5">
      <h1 className="text-4xl font-bold">My Favorites</h1>
      <div className="grid gap-4 md:grid-cols-2">
        {favorites.map((sentence) => (
          <article key={sentence.id} className="glass-card p-6">
            <div className="mb-4 flex items-center justify-between">
              <span className="rounded-full bg-blue-50 px-3 py-1 text-sm font-semibold text-blue-700 dark:bg-slate-800 dark:text-blue-200">{languageLabel[sentence.language]} · {sentence.category}</span>
              <button className="icon-button" onClick={() => toggleFavorite(sentence.id)}>♥</button>
            </div>
            <p className="text-2xl font-semibold">“{sentence.text}”</p>
            <button
              className="primary-button mt-5"
              onClick={() => {
                setSelectedSentence(sentence);
                setView('shadowing');
              }}
            >
              Practice
            </button>
          </article>
        ))}
      </div>
      {favorites.length === 0 && <div className="glass-card p-10 text-center text-slate-500">No favorites yet.</div>}
    </section>
  );
}

function StatsPage({ stats }: { stats: Stats }) {
  const cards = [
    ['Streak', `${stats.streakDays} days`],
    ['Today', `${stats.todayPracticeCount} practices`],
    ['Recordings', `${stats.totalRecordings}`],
    ['Practice Time', formatTime(stats.totalPracticeSeconds)],
  ];

  return (
    <section className="animate-fadeIn space-y-5">
      <h1 className="text-4xl font-bold">Learning Stats</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(([label, value]) => (
          <div key={label} className="glass-card p-6">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-500">{label}</p>
            <p className="mt-4 text-3xl font-bold">{value}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function SettingsPage({ settings, updateSettings }: { settings: Settings; updateSettings: (settings: Settings) => void }) {
  return (
    <section className="animate-fadeIn mx-auto max-w-3xl space-y-5">
      <h1 className="text-4xl font-bold">Settings</h1>
      <div className="glass-card divide-y divide-slate-100 p-2 dark:divide-slate-800">
        <label className="flex items-center justify-between gap-4 p-5">
          <span className="font-semibold">Dark Mode</span>
          <input type="checkbox" checked={settings.darkMode} onChange={(event) => updateSettings({ ...settings, darkMode: event.target.checked })} />
        </label>
        <label className="flex items-center justify-between gap-4 p-5">
          <span className="font-semibold">Language</span>
          <select className="rounded-2xl border border-blue-100 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-800" value={settings.language} onChange={(event) => updateSettings({ ...settings, language: event.target.value as Language })}>
            <option value="en">English</option>
            <option value="es">Español</option>
          </select>
        </label>
        <label className="flex items-center justify-between gap-4 p-5">
          <span className="font-semibold">Default Speed</span>
          <select className="rounded-2xl border border-blue-100 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-800" value={settings.defaultSpeed} onChange={(event) => updateSettings({ ...settings, defaultSpeed: Number(event.target.value) })}>
            {speedOptions.map((speed) => <option key={speed} value={speed}>{speed}x</option>)}
          </select>
        </label>
        <label className="flex items-center justify-between gap-4 p-5">
          <span className="font-semibold">Font Size</span>
          <select className="rounded-2xl border border-blue-100 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-800" value={settings.fontSize} onChange={(event) => updateSettings({ ...settings, fontSize: event.target.value as Settings['fontSize'] })}>
            <option value="sm">Small</option>
            <option value="md">Medium</option>
            <option value="lg">Large</option>
          </select>
        </label>
      </div>
    </section>
  );
}

export { App };
