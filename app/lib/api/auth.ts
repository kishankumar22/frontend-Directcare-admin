//app/lib/api/auth.ts
export const forgotPassword = async (email: string) => {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/auth/forgot-password`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    }
  );

  return res.json(); // always success message
};
export const resetPassword = async (
  email: string,
  token: string,
  newPassword: string
) => {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/auth/reset-password`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, token, newPassword }),
    }
  );

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message);
  }

  return data;
};
