export class CSSInjector {
	static init() {
		Hooks.on("ready", () => {
			this.injectSpellFoldersCSS();
			this.injectPowerFoldersCSS();
		});
	}

	static injectSpellFoldersCSS() {
		if (document.getElementById("spell-folders-css")) return;

		const cssContent = `
.spell-folders-container { margin-top: 5px; }
.spell-folder { margin-bottom: 8px; border: 1px solid #7048e8; border-radius: 4px; overflow: hidden; }
.spell-folder.collapsed .spell-folder-contents { display: none; }
.spell-folder-header { background-color: #7048e8; color: white; padding: 8px 12px; font-weight: bold; align-items: center; justify-content: space-between; }
.spell-folder-title-wrapper { cursor: pointer; display: flex; align-items: center; gap: 10px; }
.spell-folder-toggle { width: 16px; display: inline-block; text-align: center; }
.spell-folder-controls { display: flex; gap: 10px; }
.spell-folder-control { cursor: pointer; color: white; opacity: 0.8; transition: opacity 0.2s; }
.spell-folder-control:hover { opacity: 1; }
.spell-folder-contents { padding: 5px; background: rgba(0,0,0,0.05); }
.spell-circle-header { font-weight: bold; padding: 4px 8px; opacity: 0.85; color: var(--t20a-text-primary, var(--t20dm-text-primary, var(--color-text-dark-primary, #191813))); }
.spell-item { padding: 4px 8px; border-bottom: 1px solid rgba(0,0,0,0.1); }
.spell-item:last-child { border-bottom: none; }
.spell-folder-empty { padding: 10px; text-align: center; font-style: italic; color: var(--t20a-text-muted, var(--t20dm-text-muted, #666)); }
.drag-over { border: 2px dashed #7048e8 !important; background: rgba(112, 72, 232, 0.1) !important; }
.spell-folder-drag-handle { cursor: grab; }
.spell-folder-drag-handle:active { cursor: grabbing; }`;

		const style = document.createElement("style");
		style.id = "spell-folders-css";
		style.textContent = cssContent;
		document.head.appendChild(style);
	}

	static injectPowerFoldersCSS() {
		if (document.getElementById("power-folders-css")) return;

		const cssContent = `
.power-folders-container { margin-top: 5px; }
.power-folder { margin-bottom: 8px; border: 1px solid #6c757d; border-radius: 4px; overflow: hidden; }
.power-folder.collapsed .folder-contents { display: none; }
.folder-header { background-color: #6c757d; color: white; padding: 8px 12px; font-weight: bold; align-items: center; justify-content: space-between; }
.folder-title-wrapper { cursor: pointer; display: flex; align-items: center; gap: 10px; }
.folder-toggle { width: 16px; display: inline-block; text-align: center; }
.folder-controls { display: flex; gap: 10px; }
.folder-control { cursor: pointer; color: white; opacity: 0.8; transition: opacity 0.2s; }
.folder-control:hover { opacity: 1; }
.folder-contents { list-style: none; margin: 0; padding: 5px; background: rgba(0,0,0,0.05); }
.power-item { padding: 4px 8px; border-bottom: 1px solid rgba(0,0,0,0.1); }
.power-item:last-child { border-bottom: none; }
.folder-empty { padding: 10px; text-align: center; font-style: italic; color: var(--t20a-text-muted, var(--t20dm-text-muted, #666)); }
.drag-over { border: 2px dashed #007bff !important; background: rgba(0, 123, 255, 0.1) !important; }
.folder-drag-handle { cursor: grab; }
.folder-drag-handle:active { cursor: grabbing; }`;

		const style = document.createElement("style");
		style.id = "power-folders-css";
		style.textContent = cssContent;
		document.head.appendChild(style);
	}
}
