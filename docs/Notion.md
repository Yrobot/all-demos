# Notion

> https://developers.notion.com/

## .env

```bash
# .env
NOTION_OAUTH_CLIENT_ID=<client-id>
NOTION_OAUTH_CLIENT_SECRET=<client-secret>
REDIRECT_URL=<client-redirect-url>
```

## Auth Flows

### 1. install Integration

> integration access page

> https://api.notion.com/v1/oauth/authorize?response_type=code&owner=user&client_id=1bbccedc-bb97-4ebb-88df-9fdd60f02f08&redirect_uri=https%3A%2F%2Fwww.brainglue.ai%2F%3Fnotion_sucess%3Dtrue

![nKeEWh-11-57-31](https://images.yrobot.top/2024-09-23/nKeEWh-11-57-31.png)

- display the permissions of the integration
- select access pages

#### Result

- Cancel the access
- Allow the access: with selected pages
  - all pages
  - some of the pages
  - no pages

#### Situations should be handled

##### 1. user not access all pages

### 2. back to redirect_uri

> the page handle the integration install result

> $REDIRECT_URL?code=03ae371f-3e6d-4b11-9c93-e9013ae47795&status=

Notion will redirect to the redirect_uri with different url parameters for the different install results:

- `code` & `state`: Allow the access
- `error`: Cancel the access

#### Situations should be handled

##### 1. The display for Access Denied

##### 2. The display for Access Granted

### 3. Get Auth Token

> use Notion API to get access token with the `code` parameter

- [Notion Auth API](https://developers.notion.com/reference/create-a-token)

```ts
const clientId = NOTION_OAUTH_CLIENT_ID;
const clientSecret = NOTION_OAUTH_CLIENT_SECRET;
const redirectUri = REDIRECT_URL;

const codeToToken = async (code: string) => {
  const encoded = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const response = await fetch("https://api.notion.com/v1/oauth/token", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Basic ${encoded}`,
    },
    body: JSON.stringify({
      grant_type: "authorization_code",
      code: code,
      redirect_uri: redirectUri,
    }),
  }).then((res) => res.json());
  const token = response?.access_token;
  return token;
};
```

## Other Flows

### - List Pages

- use Notion API and token to list pages

```ts
type Parent =
  | {
      type: "workspace";
      workspace: true;
    }
  | {
      type: "database_id";
      database_id: string;
    }
  | {
      type: "page_id";
      page_id: string;
    }
  | {
      type: "block_id";
      block_id: string;
    };

type Page = {
  id: string;
  parent: Parent;
  title: string;
};

export const getAllPages = async ({
  token,
  search = "",
}: {
  token: string;
  search?: string;
}) => {
  if (!token) throw new Error("token is required");
  const response = await notionFetch("https://api.notion.com/v1/search", {
    method: "POST",
    token: `Bearer ${token}`,
    body: {
      query: search,
      filter: {
        property: "object",
        value: "page",
      },
    },
  });
  const pages: Page[] = (response?.results ?? []).map((result: any) => ({
    id: result?.id,
    parent: result.parent as Parent,
    title: result?.properties?.title?.title?.[0]?.plain_text,
  }));
  return pages;
};
```

the Parent Object Document: https://developers.notion.com/reference/parent-object

Tips: the `workspace` is the top level scope of Notion.

#### Result Structure

```json
[
  {
    "id": "107a42ed-c8f7-80d3-bbd1-deb70d057400",
    "parent": {
      "type": "workspace",
      "workspace": true
    },
    "title": "Job Application Tracker"
  },
  {
    "id": "107a42ed-c8f7-80e0-9f0f-ff3ddf9cb92d",
    "parent": {
      "type": "workspace",
      "workspace": true
    },
    "title": "Parent Page"
  },
  {
    "id": "0e68c737-dabc-474f-add3-de1a473e7eb3",
    "parent": {
      "type": "page_id",
      "page_id": "107a42ed-c8f7-80e0-9f0f-ff3ddf9cb92d"
    },
    "title": "Child Page"
  }
]
```

### - Create New Page

```bash
POST 'https://api.notion.com/v1/pages'
```

- `body.parent.page_id` or `body.parent.database_id` is required

### - Create New Database

```bash
POST 'https://api.notion.com/v1/databases'
```

- `body.parent.page_id` is required

### - Add Page & Update Page Content

```json
{
  "parent": { "page_id": "494c87d0-72c4-4cf6-960f-55f8427f7692" },
  "properties": {
    "title": {
      "title": [
        {
          "type": "text",
          "text": { "content": "A note from your pals at Notion" }
        }
      ]
    }
  },
  "children": [
    {
      "object": "block",
      "type": "paragraph",
      "paragraph": {
        "rich_text": [
          {
            "type": "text",
            "text": {
              "content": "You made this page using the Notion API. Pretty cool, huh? We hope you enjoy building with us."
            }
          }
        ]
      }
    }
  ]
}
```

#### Situations should be handled

##### 1. For Creating new Page, it requires at least one access page for root.

If there is no access page by user, then we will not be able to create new page or new database (since we could not provide `parent.page_id`).

##### 2. For Inject content into Notion, we have to ask user to reselect the access page for Integration when there is no access page. Or we could not inject the content into the new page or the excited page.