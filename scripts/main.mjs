import { SpellFolderInjector, PowerFolderInjector } from "./toggle-injector.mjs";
import SpellFolderManager from "./spell-folder-manager.mjs";
import PowerFolderManager from "./power-folder-manager.mjs";
import { CSSInjector } from "./css-injector.mjs";
import "./template-override.mjs";

Hooks.once("init", () => {
	window.SpellFolderManager = SpellFolderManager;
	window.SpellFolderInjector = SpellFolderInjector;
	window.PowerFolderManager = PowerFolderManager;
	window.PowerFolderInjector = PowerFolderInjector;
});

Hooks.once("ready", () => {
	CSSInjector.init();
	SpellFolderInjector.init();
	PowerFolderInjector.init();
});
