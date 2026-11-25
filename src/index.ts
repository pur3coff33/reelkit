import { registerRoot } from "remotion";
import { Root } from "./Root";
import { loadNunito } from "./kit/remotion/base";

loadNunito();
registerRoot(Root);
