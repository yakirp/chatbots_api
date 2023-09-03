FROM --platform=linux/amd64 public.ecr.aws/lambda/nodejs:18
COPY package*.json ./
RUN npm install
COPY --chown=admin:admin . .
CMD [ "index.handler" ]
