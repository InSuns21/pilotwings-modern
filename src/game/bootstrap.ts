import { createFlightSession, type FlightSession } from './FlightSession';
import { mountStartScreen, type StartScreenController } from './StartScreen';

export async function bootstrapGame(root: HTMLElement): Promise<void> {
  let startScreen: StartScreenController | null = null;
  let flightSession: FlightSession | null = null;

  const showTitle = (): void => {
    flightSession?.dispose();
    flightSession = null;
    startScreen?.dispose();

    startScreen = mountStartScreen(root, async (selection) => {
      startScreen?.dispose();
      startScreen = null;

      flightSession = await createFlightSession(root, selection, showTitle);
    });
  };

  showTitle();
}
