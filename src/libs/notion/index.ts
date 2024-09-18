export const getAuthUrl = (params: {
  client_id: string;
  redirect_uri: string;
  scope?: string;
}) =>
  `https://api.notion.com/v1/oauth/authorize?${new URLSearchParams({
    response_type: "code",
    owner: "user",
    ...params,
  }).toString()}`;

export const TOKEN_LOCAL_KEY = "NOTION_TOKEN";
export const setTokenToLocal = (token: string) => {
  localStorage.setItem(TOKEN_LOCAL_KEY, token);
};

export const getTokenFromLocal = (): string | null => {
  return localStorage.getItem(TOKEN_LOCAL_KEY);
};
