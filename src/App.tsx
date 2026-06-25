import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MIN_RECORD_SECONDS } from "./constants";
import { AUDIO_TRACKS } from "./data/audio";
import { useServiceWorkerUpdates } from "./hooks/useServiceWorkerUpdates";
import { AudioSelect } from "./components/AudioSelect";
import { CarePersonDetail } from "./components/CarePersonDetail";
import { CareView } from "./components/CareView";
import { Header } from "./components/Header";
import { Home } from "./components/Home";
import { JourneyResult } from "./components/JourneyResult";
import { MeditationProgress, MeditationSession, MeditationSessionHandle } from "./components/MeditationSession";
import { Navigation } from "./components/Navigation";
import { Settings } from "./components/Settings";
import { StatsView } from "./components/StatsView";
import { UpdateHistory } from "./components/UpdateHistory";
import { UpdateNotice } from "./components/UpdateNotice";
import type { CarePerson, CareRecord, JourneyTicket, Route, StatsRange } from "./types";
import { formatClock } from "./utils/format";
import { getSessionId } from "./utils/id";
import {
  readCarePeople,
  readJourneyTickets,
  readSelectedAudioId,
  writeCarePeople,
  writeJourneyTickets,
  writeSelectedAudioId
} from "./utils/storage";
import { getSortedJourneyTickets } from "./utils/stats";

const initialAudioDurations = Object.fromEntries(
  AUDIO_TRACKS.map((track) => [track.id, track.durationSeconds])
) as Record<string, number>;

export default function App() {
  const [route, setRoute] = useState<Route>("home");
  const [journeyTickets, setJourneyTickets] = useState<JourneyTicket[]>(() => readJourneyTickets());
  const [carePeople, setCarePeople] = useState<CarePerson[]>(() => readCarePeople());
  const [selectedAudioId, setSelectedAudioId] = useState(() => readSelectedAudioId());
  const [audioDurations, setAudioDurations] = useState<Record<string, number>>(initialAudioDurations);
  const [savedTicket, setSavedTicket] = useState<JourneyTicket | null>(null);
  const [activeCarePersonId, setActiveCarePersonId] = useState("");
  const [activeStatsRange, setActiveStatsRange] = useState<StatsRange>("total");
  const [meditationProgress, setMeditationProgress] = useState<MeditationProgress>({
    elapsedSeconds: 0,
    isRunning: false
  });
  const meditationRef = useRef<MeditationSessionHandle | null>(null);
  const mainRef = useRef<HTMLElement | null>(null);
  const { updateSummary, applyUpdate } = useServiceWorkerUpdates();

  const sortedTickets = useMemo(() => getSortedJourneyTickets(journeyTickets), [journeyTickets]);
  const latestTicket = sortedTickets[0] || null;
  const selectedTrack = AUDIO_TRACKS.find((track) => track.id === selectedAudioId) || AUDIO_TRACKS[0];
  const activeCarePerson = carePeople.find((person) => person.id === activeCarePersonId) || null;

  useEffect(() => {
    const main = mainRef.current;
    const skipLink = document.querySelector<HTMLAnchorElement>(".skip-link");
    if (!main || !skipLink) return undefined;

    const mainElement = main;
    const skipLinkElement = skipLink;
    let revealTimer: number | undefined;

    function hideSkipLink() {
      window.clearTimeout(revealTimer);
      skipLinkElement.classList.remove("is-visible");
    }

    function revealSkipLinkLater() {
      window.clearTimeout(revealTimer);
      revealTimer = window.setTimeout(() => {
        skipLinkElement.classList.add("is-visible");
      }, 1800);
    }

    function handleFocusIn(event: FocusEvent) {
      if (event.target instanceof Node && mainElement.contains(event.target)) {
        hideSkipLink();
        return;
      }

      revealSkipLinkLater();
    }

    mainElement.addEventListener("pointerenter", hideSkipLink);
    mainElement.addEventListener("pointerleave", revealSkipLinkLater);
    mainElement.addEventListener("focusin", handleFocusIn);
    document.addEventListener("focusin", handleFocusIn);
    skipLinkElement.addEventListener("click", hideSkipLink);

    return () => {
      window.clearTimeout(revealTimer);
      mainElement.removeEventListener("pointerenter", hideSkipLink);
      mainElement.removeEventListener("pointerleave", revealSkipLinkLater);
      mainElement.removeEventListener("focusin", handleFocusIn);
      document.removeEventListener("focusin", handleFocusIn);
      skipLinkElement.removeEventListener("click", hideSkipLink);
    };
  }, []);

  const navigate = useCallback((nextRoute: Route) => {
    if (nextRoute === route) return;

    if (route === "meditate" && (meditationProgress.isRunning || meditationProgress.elapsedSeconds > 0)) {
      const elapsedSeconds = meditationRef.current?.getProgress().elapsedSeconds || meditationProgress.elapsedSeconds;
      const willRecord = elapsedSeconds >= MIN_RECORD_SECONDS;
      const message = willRecord
        ? `离开冥想页会结束本次冥想，并保存 ${formatClock(elapsedSeconds)} 的记录。是否继续？`
        : `离开冥想页会结束本次冥想。已进行 ${formatClock(elapsedSeconds)}，满 ${formatClock(MIN_RECORD_SECONDS)} 才会保存记录。是否继续？`;
      if (!window.confirm(message)) return;
      meditationRef.current?.finish();
    }

    setRoute(nextRoute);
    window.requestAnimationFrame(() => mainRef.current?.focus({ preventScroll: true }));
  }, [meditationProgress.elapsedSeconds, meditationProgress.isRunning, route]);

  function updateTickets(nextTickets: JourneyTicket[]) {
    setJourneyTickets(nextTickets);
    writeJourneyTickets(nextTickets);
  }

  function updatePeople(nextPeople: CarePerson[]) {
    setCarePeople(nextPeople);
    writeCarePeople(nextPeople);
  }

  function handleSelectAudio(audioId: string) {
    setSelectedAudioId(audioId);
    writeSelectedAudioId(audioId);
  }

  function handleSavedTicket(ticket: JourneyTicket) {
    const nextTickets = [ticket, ...journeyTickets];
    updateTickets(nextTickets);
    setSavedTicket(ticket);
    setMeditationProgress({ elapsedSeconds: 0, isRunning: false });
    setRoute("journey-result");
  }

  function toggleTicketFavorite(ticketId: string) {
    const nextTickets = journeyTickets.map((ticket) => (
      ticket.id === ticketId ? { ...ticket, favorite: !ticket.favorite } : ticket
    ));
    updateTickets(nextTickets);
    setSavedTicket(nextTickets.find((ticket) => ticket.id === ticketId) || null);
  }

  function addCarePerson(person: Omit<CarePerson, "id" | "records" | "createdAt">) {
    updatePeople([
      {
        ...person,
        id: getSessionId(),
        records: [],
        createdAt: new Date().toISOString()
      },
      ...carePeople
    ]);
  }

  function addCareRecord(personId: string, content: string) {
    const record: CareRecord = {
      id: getSessionId(),
      content,
      score: 1,
      createdAt: new Date().toISOString()
    };

    updatePeople(carePeople.map((person) => (
      person.id === personId
        ? { ...person, records: [record, ...person.records] }
        : person
    )));
  }

  function updateCareBirthday(personId: string, birthday: string) {
    updatePeople(carePeople.map((person) => (
      person.id === personId ? { ...person, birthday } : person
    )));
  }

  function renderRoute() {
    if (route === "audio-select") {
      return (
        <AudioSelect
          selectedAudioId={selectedAudioId}
          audioDurations={audioDurations}
          onSelectAudio={handleSelectAudio}
          onBegin={() => {
            setSavedTicket(null);
            setMeditationProgress({ elapsedSeconds: 0, isRunning: false });
            setRoute("meditate");
          }}
          onBack={() => navigate("home")}
        />
      );
    }

    if (route === "meditate") {
      return (
        <MeditationSession
          ref={meditationRef}
          selectedTrack={selectedTrack}
          knownDuration={audioDurations[selectedTrack.id] || 0}
          ticketCount={journeyTickets.length}
          onDurationLoaded={(trackId, duration) => {
            setAudioDurations((current) => ({ ...current, [trackId]: duration }));
          }}
          onSaved={handleSavedTicket}
          onCanceled={() => {
            setMeditationProgress({ elapsedSeconds: 0, isRunning: false });
            setRoute("home");
          }}
          onProgressChange={setMeditationProgress}
        />
      );
    }

    if (route === "journey-result") {
      const ticket = savedTicket ? journeyTickets.find((item) => item.id === savedTicket.id) || savedTicket : null;
      if (!ticket) return <StatsView tickets={sortedTickets} activeRange={activeStatsRange} onRangeChange={setActiveStatsRange} />;
      return (
        <JourneyResult
          ticket={ticket}
          onToggleFavorite={toggleTicketFavorite}
          onAgain={() => {
            setSavedTicket(null);
            setRoute("meditate");
          }}
          onStats={() => {
            setSavedTicket(null);
            setRoute("stats");
          }}
        />
      );
    }

    if (route === "stats") {
      return <StatsView tickets={sortedTickets} activeRange={activeStatsRange} onRangeChange={setActiveStatsRange} />;
    }

    if (route === "care") {
      return (
        <CareView
          people={carePeople}
          onAddPerson={addCarePerson}
          onAddRecord={addCareRecord}
          onOpenDetail={(personId) => {
            setActiveCarePersonId(personId);
            setRoute("care-person");
          }}
        />
      );
    }

    if (route === "care-person") {
      if (!activeCarePerson) {
        return (
          <CareView
            people={carePeople}
            onAddPerson={addCarePerson}
            onAddRecord={addCareRecord}
            onOpenDetail={(personId) => {
              setActiveCarePersonId(personId);
              setRoute("care-person");
            }}
          />
        );
      }

      return (
        <CarePersonDetail
          person={activeCarePerson}
          onBack={() => {
            setActiveCarePersonId("");
            setRoute("care");
          }}
          onUpdateBirthday={updateCareBirthday}
          onAddRecord={addCareRecord}
        />
      );
    }

    if (route === "settings") {
      return (
        <Settings
          tickets={journeyTickets}
          people={carePeople}
          onClearTickets={() => updateTickets([])}
          onUpdateHistory={() => setRoute("update-history")}
        />
      );
    }

    if (route === "update-history") {
      return <UpdateHistory onBack={() => setRoute("settings")} />;
    }

    return <Home latestTicket={latestTicket} onStart={() => setRoute("audio-select")} />;
  }

  return (
    <div className="app-shell">
      <Header />
      <main id="app" className="view-host" tabIndex={-1} ref={mainRef}>
        {renderRoute()}
      </main>
      <Navigation route={route} onNavigate={navigate} />
      {updateSummary ? <UpdateNotice summary={updateSummary} onApply={applyUpdate} /> : null}
    </div>
  );
}
