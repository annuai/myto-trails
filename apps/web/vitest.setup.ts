// Runs before every website unit test: adds the DOM matchers and unmounts what a test rendered, so tests cannot leak into each other.

import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

afterEach(cleanup);
