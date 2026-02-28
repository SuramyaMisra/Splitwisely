const BASE_URL = "http://127.0.0.1:5000/api";

async function request(method, path, body = null) {
  const options = {
    method,
    headers: { "Content-Type": "application/json" },
  };
  if (body) options.body = JSON.stringify(body);

  const response = await fetch(`${BASE_URL}${path}`, options);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Something went wrong");
  }
  return data;
}

export const getUsers = () => request("GET", "/users/");
export const createUser = (payload) => request("POST", "/users/", payload);
export const getGroups = () => request("GET", "/groups/");
export const createGroup = (payload) => request("POST", "/groups/", payload);
export const getGroup = (id) => request("GET", `/groups/${id}`);
export const addMember = (groupId, payload) =>
  request("POST", `/groups/${groupId}/members`, payload);
export const getExpenses = (groupId) =>
  request("GET", `/groups/${groupId}/expenses`);
export const addExpense = (groupId, payload) =>
  request("POST", `/groups/${groupId}/expenses`, payload);
export const getBalances = (groupId) =>
  request("GET", `/groups/${groupId}/balances`);
export const settleDebt = (groupId, payload) =>
  request("POST", `/groups/${groupId}/settle`, payload);
export const getGroupSummary = (groupId) =>
  request("GET", `/groups/${groupId}/summary`);