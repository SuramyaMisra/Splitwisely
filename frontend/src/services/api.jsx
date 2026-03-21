const BASE_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:5000/api";

let authToken = null;

export const setToken   = (token) => { authToken = token; };
export const clearToken = ()      => { authToken = null; };
export const getToken   = ()      => authToken;

async function request(method, path, body = null) {
  const headers = { "Content-Type": "application/json" };
  if (authToken) headers["Authorization"] = `Bearer ${authToken}`;

  const options = { method, headers };
  if (body) options.body = JSON.stringify(body);

  const response = await fetch(`${BASE_URL}${path}`, options);
  const data = await response.json();

  if (!response.ok) throw new Error(data.error || "Something went wrong");
  return data;
}

// Auth
export const register = (payload) => request("POST", "/auth/register", payload);
export const login    = (payload) => request("POST", "/auth/login",    payload);
export const getMe    = ()        => request("GET",  "/auth/me");

// Users
export const getUsers    = ()        => request("GET",  "/users/");
export const createUser  = (payload) => request("POST", "/users/", payload);

// Groups
export const getGroups   = ()        => request("GET",  "/groups/");
export const createGroup = (payload) => request("POST", "/groups/", payload);
export const getGroup    = (id)      => request("GET",  `/groups/${id}`);

// Members
export const addMember    = (groupId, payload) => request("POST",   `/groups/${groupId}/members`,         payload);
export const removeMember = (groupId, userId)  => request("DELETE", `/groups/${groupId}/members/${userId}`);

// Expenses
export const getExpenses  = (groupId)          => request("GET",  `/groups/${groupId}/expenses`);
export const addExpense   = (groupId, payload) => request("POST", `/groups/${groupId}/expenses`,       payload);
export const getBalances  = (groupId)          => request("GET",  `/groups/${groupId}/balances`);
export const settleDebt   = (groupId, payload) => request("POST", `/groups/${groupId}/settle`,         payload);
export const parseExpense = (groupId, text)    => request("POST", `/groups/${groupId}/parse-expense`,  { text });

// AI
export const getGroupSummary = (groupId) => request("GET", `/groups/${groupId}/summary`);

export const updateGroup   = (groupId, payload)     => request("PUT",    `/groups/${groupId}`,                    payload);
export const deleteGroup   = (groupId)               => request("DELETE", `/groups/${groupId}`);
export const deleteExpense = (groupId, expenseId)    => request("DELETE", `/groups/${groupId}/expenses/${expenseId}`);

export const scanBill = (groupId, image, type) => request("POST", `/groups/${groupId}/scan-bill`, { image, type });