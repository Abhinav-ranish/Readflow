# Deployment Guide

Readex is designed to run on **Vercel** (for Frontend/API) with **Cloudflare D1** (for Serverless Database).

## 1. Prerequisites
- A GitHub Account
- A Vercel Account
- A Cloudflare Account

## 2. Setting up the Database (Cloudflare D1)

1.  Log in to the Cloudflare Dashboard.
2.  Go to **Workers & Pages** -> **D1**.
3.  Click **Create Database**. Name it `readex-db`.
4.  Once created, copy the **Database ID**.
5.  Go to the **Settings** or **API Tokens** section of Cloudflare.
6.  Create a **User API Token** with permissions:
    - `Account.D1`: Edit
7.  Copy your **Account ID** (found in the URL or dashboard sidebar).

## 3. Deploying to Vercel

1.  Push this code to a GitHub repository.
2.  Import the repository in Vercel.
3.  **Use the default settings** (Framework: Next.js).
4.  Add the following **Environment Variables**:

| Variable | Description |
| :--- | :--- |
| `CLOUDFLARE_ACCOUNT_ID` | Your Cloudflare Account ID |
| `CLOUDFLARE_DATABASE_ID` | The ID of the D1 database you created |
| `CLOUDFLARE_API_TOKEN` | Your Cloudflare User API Token |

5.  Click **Deploy**.

## 4. Verification

1.  Open your Vercel deployment URL.
2.  Write something in the editor.
3.  Click **Share**.
4.  The app will automatically create the `readmes` table in your D1 database on the first write.
5.  If the link works, you're live!

## Troubleshooting

- **500 Error on Share?** Check your Environment Variables in Vercel.
- **Link shows 404?** Ensure the D1 database isn't empty/deleted. Check Vercel logs.
