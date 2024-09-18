// VAR
const CODE = "0031493aa-aeae-41b3-9ba0-de86ea96c3b7";

const clientId = "1bbccedc-bb97-4ebb-88df-9fdd60f02f08";
const clientSecret = "secret_wv4HrdnPRlqmWvZ0ShRrEUKvLREAHSFpqBk4SqDthUA";
const redirectUri = "https://www.brainglue.ai/?notion_sucess=true";

// function
const encoded = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

const codeToToken = async () => {
  const response = await fetch("https://api.notion.com/v1/oauth/token", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Basic ${encoded}`,
    },
    body: JSON.stringify({
      grant_type: "authorization_code",
      code: CODE,
      // redirect_uri: redirectUri,
    }),
  }).then((res) => res.json());
  console.log(response);
};

(async () => {
  await codeToToken();
})().catch(console.error);
