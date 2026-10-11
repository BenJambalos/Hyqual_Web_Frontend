import { api } from "../api/client";
import { useCollection } from "./useCollection";

export function useUsers() {
  const { items: users, loading, error } = useCollection("users");

  const addUser = async (userData) => {
    await api.createUser(userData);
  };

  const updateUser = async (id, updates) => {
    await api.updateUser(id, updates);
  };

  const archiveUser = async (id) => {
    await api.updateUser(id, { archived: true });
  };

  const restoreUser = async (id) => {
    await api.updateUser(id, { archived: false });
  };

  const deleteUser = async (id) => {
    await api.deleteUser(id);
  };

  return { users, loading, error, addUser, updateUser, archiveUser, restoreUser, deleteUser };
}