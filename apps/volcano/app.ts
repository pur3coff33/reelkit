import { simApp } from "../../src/kit/lowpoly/app";
import { writeMusic } from "./music";
import { config } from "./reel.config";

export const app = simApp(config, writeMusic);
