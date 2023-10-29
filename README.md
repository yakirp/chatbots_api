# Deploying with Serverless Framework

## Prerequisites:

1. **Node.js and npm**: Ensure you have Node.js and npm installed. If not, download and install them from [here](https://nodejs.org/).
2. **AWS CLI**: Ensure you have the AWS CLI installed and configured with the necessary access rights. If not, follow the guide [here](https://aws.amazon.com/cli/).
3. **Pinecone**: Open a free Pinecone account and create an index
4. **Database**: Create a free Postgres db with Vercel
5. **Setup env**: See `.env.example`
6. **Deploy with Serverless**:

   1. ```bash
      npm i
      ```

   2. ```bash
      npm install -g serverless
      ```

   3. ```bash
      sls deploy
      ```
