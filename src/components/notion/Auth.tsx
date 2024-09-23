"use client";
import React, { useState, useEffect } from "react";
import { getAuthUrl } from "@/libs/notion";
import { REDIRECT_URL, NOTION_OAUTH_CLIENT_ID } from "@/env";

function Auth({
  children,
  clientId,
  redirectPath = "/notion",
}: {
  children: React.ReactNode;
  clientId?: string;
  redirectPath?: string;
}) {
  // const [url, setUrl] = useState(
  //   `https://www.brainglue.ai/?notion_sucess=true`
  // );
  // useEffect(() => {
  //   setUrl(`${window.location.origin}${redirectPath}`);
  // }, []);
  return (
    <a
      href={getAuthUrl({
        client_id: NOTION_OAUTH_CLIENT_ID,
        redirect_uri: REDIRECT_URL,
      })}
      className="btn btn-neutral"
      target="_blank"
      rel="noreferrer"
    >
      {children}
    </a>
  );
}

export default Auth;
