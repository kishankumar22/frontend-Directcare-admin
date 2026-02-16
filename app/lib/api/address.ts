const BASE_URL = process.env.NEXT_PUBLIC_API_URL;

export const getAddresses = async (token: string) => {
  const res = await fetch(`${BASE_URL}/api/addresses`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });

  const data = await res.json();

  if (!res.ok) throw new Error(data.message);
  return data.data;
};

export const createAddress = async (token: string, payload: any) => {
  const res = await fetch(`${BASE_URL}/api/addresses`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.message);
  return data.data;
};

export const updateAddress = async (
  token: string,
  id: string,
  payload: any
) => {
  const res = await fetch(`${BASE_URL}/api/addresses/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.message);
  return data.data;
};

export const deleteAddress = async (token: string, id: string) => {
  const res = await fetch(`${BASE_URL}/api/addresses/${id}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.message);
  return true;
};

export const setDefaultAddress = async (token: string, id: string) => {
  const res = await fetch(
    `${BASE_URL}/api/addresses/${id}/set-default`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  const data = await res.json();
  if (!res.ok) throw new Error(data.message);
  return true;
};
