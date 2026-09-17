import api from "./api";
import type { Room, RoomStatus } from "../types/room";

export const getRooms = async (): Promise<Room[]> => {
  const response = await api.get<Room[]>("/rooms");
  return response.data;
};

export const getRoomById = async (roomId: string): Promise<Room> => {
  const response = await api.get<Room>(`/rooms/${roomId}`);
  return response.data;
};

export const createRoom = async (room: {
  roomId: string;
  roomNumber: string;
  roomType: string;
  floor: number;
  pricePerNight: number;
  status?: string;
}): Promise<Room> => {
  const response = await api.post<Room>("/rooms", room);
  return response.data;
};

export const updateRoom = async (
  roomId: string,
  room: {
    roomNumber: string;
    roomType: string;
    floor: number;
    pricePerNight: number;
  }
): Promise<Room> => {
  const response = await api.put<Room>(`/rooms/${roomId}`, room);
  return response.data;
};

export const updateRoomStatus = async (
  roomId: string,
  status: RoomStatus
): Promise<Room> => {
  const response = await api.patch<Room>(`/rooms/${roomId}/status`, { status });
  return response.data;
};

export const uploadRoomImage = async (
  roomId: string,
  file: File
): Promise<Room> => {
  const formData = new FormData();
  formData.append("file", file);
  const response = await api.post<Room>(`/rooms/${roomId}/images`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
};

export const deleteRoomImage = async (
  roomId: string,
  imageUrl: string
): Promise<Room> => {
  const response = await api.delete<Room>(`/rooms/${roomId}/images`, {
    params: { imageUrl },
  });
  return response.data;
};

export const getAvailableRooms = async (
  checkInDate: string,
  checkOutDate: string,
  numberOfGuests: number
): Promise<Room[]> => {
  const response = await api.get<Room[]>("/reservations/availability", {
    params: {
      checkInDate,
      checkOutDate,
      numberOfGuests,
    },
  });

  return response.data;
};