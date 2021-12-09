"use strict";

const axios = require("axios");

const baseURL = process.env.CLI_BASE_URL
  ? process.env.CLI_BASE_URL
  : "http://localhost:7001";

const request = axios.create({
  baseURL: baseURL,
  timeout: 5000,
});

request.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (err) => {
    return Promise.reject(err);
  }
);

module.exports = request;
