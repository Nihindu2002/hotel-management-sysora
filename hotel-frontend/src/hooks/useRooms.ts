import { useQuery } from '@tanstack/react-query';
import { getRooms } from '../services/roomService';
import type { Room } from '../types/room';

/**
 * The room list, shared.
 *
 * Eleven components fetch rooms independently, and nothing is shared between
 * them — so this is the endpoint where a cache pays off most. Every caller of
 * this hook inside the same 30-second window reads one cached result instead
 * of issuing its own request.
 *
 * Migrating a call site is mechanical: drop the `useEffect` and its
 * `rooms`/`loading`/`error` state in favour of this hook. The existing
 * `// A room under maintenance is not something to advertise` filters stay at
 * the call site, since which rooms are relevant differs per page.
 */
export function useRooms() {
  const { data, isPending, error } = useQuery({
    queryKey: ['rooms'],
    queryFn: getRooms,
  });

  return {
    rooms: (data ?? []) as Room[],
    loading: isPending,
    error: error instanceof Error ? error.message : '',
  };
}
