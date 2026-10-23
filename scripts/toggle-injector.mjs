/**
 * Controles de alternância (toggle) e drag-and-drop para as pastas de
 * Magias e de Poderes. Duas classes separadas (mesma lógica, adaptada ao
 * respectivo tipo de item) para evitar qualquer colisão de nomes entre
 * os dois recursos dentro do módulo único.
 */

// Precisa ser um módulo ativo (ver nota em spell-folder-manager.mjs).
const MAGIAS_MOD_ID = "agrupador-t20";
const PODERES_FLAG_SCOPE = "tormenta20"; // mantém o escopo original usado pelo Agrupador de Poderes

export class SpellFolderInjector {
	static init() {}

	static injectControls(app, html, actor) {
		let spellsSection = html.find(".tab.spells");
		if (spellsSection.length === 0) spellsSection = html.find(".list-spells");
		if (spellsSection.length === 0) return;

		if (html.find(".toggle-spell-folders").length === 0) {
			const headerControls = spellsSection.find(".item-header .item-controls, .item-header").first();
			if (headerControls.length > 0) {
				const useSpellFolders = actor.getFlag(MAGIAS_MOD_ID, "useSpellFolders") || false;
				const toggleHtml = `
					<a class="item-control toggle-spell-folders" title="${useSpellFolders ? "Desativar Agrupamento" : "Ativar Agrupamento"}">
						<i class="fas ${useSpellFolders ? "fa-toggle-on" : "fa-toggle-off"}"></i>
					</a>`;
				headerControls.prepend(toggleHtml);
			}
		}

		this.setupEventListeners(app, html, actor);
	}

	static setupEventListeners(app, html, actor) {
		const useSpellFolders = actor.getFlag(MAGIAS_MOD_ID, "useSpellFolders") || false;

		const clickSelectors =
			'.toggle-spell-folders, .spell-folder-create, [data-action="toggle-spell-folder"], ' +
			'[data-action="rename-spell-folder"], [data-action="delete-spell-folder"]';
		html.find(clickSelectors).off("click");

		if (useSpellFolders) {
			html.find(".spell-item, .spell-folder-header").off("dragstart").off("drop").off("dragover");
		}

		html.find(".toggle-spell-folders").on("click", async (event) => {
			event.preventDefault();
			event.stopPropagation();
			const current = actor.getFlag(MAGIAS_MOD_ID, "useSpellFolders") || false;
			await actor.setFlag(MAGIAS_MOD_ID, "useSpellFolders", !current);
			app.render(true);
		});

		html.find(".spell-folder-create").on("click", async (event) => {
			event.preventDefault();
			event.stopPropagation();
			if (window.SpellFolderManager) {
				await window.SpellFolderManager.promptCreateFolder(actor);
				app.render(true);
			}
		});

		html.find('[data-action="toggle-spell-folder"]').on("click", async (event) => {
			event.preventDefault();
			event.stopPropagation();
			const folderId =
				$(event.currentTarget).data("folder-id") ||
				$(event.currentTarget).closest(".spell-folder-header").data("folder-id");
			if (window.SpellFolderManager && folderId) {
				await window.SpellFolderManager.toggleCollapse(actor, folderId);
				app.render(true);
			}
		});

		html.find('[data-action="rename-spell-folder"]').on("click", async (event) => {
			event.preventDefault();
			event.stopPropagation();
			const folderElement = $(event.currentTarget).closest(".spell-folder");
			const folderId = folderElement.data("folder-id");
			const folderName = folderElement.find(".spell-folder-name").text();
			if (window.SpellFolderManager && folderId) {
				await window.SpellFolderManager.promptRenameFolder(actor, folderId, folderName);
				app.render(true);
			}
		});

		html.find('[data-action="delete-spell-folder"]').on("click", async (event) => {
			event.preventDefault();
			event.stopPropagation();
			const folderId = $(event.currentTarget).closest(".spell-folder").data("folder-id");

			const DialogV2 = foundry.applications?.api?.DialogV2 || Dialog;
			const confirmado = await DialogV2.confirm({
				window: { title: "Excluir Pasta" },
				content: "<p>Tem certeza que deseja excluir esta pasta? As magias não serão excluídas.</p>",
				modal: true,
				yes: { label: "Excluir", icon: "fas fa-trash" },
				no: { label: "Cancelar", icon: "fas fa-times" }
			});

			if (confirmado && window.SpellFolderManager && folderId) {
				await window.SpellFolderManager.deleteFolder(actor, folderId);
				app.render(true);
			}
		});

		this.setupDragAndDrop(app, html, actor);
	}

	static setupDragAndDrop(app, html, actor) {
		const useSpellFolders = actor.getFlag(MAGIAS_MOD_ID, "useSpellFolders") || false;
		if (!useSpellFolders) return;

		html.find(".spell-item").attr("draggable", true).on("dragstart", (event) => {
			const spellId = $(event.currentTarget).data("item-id");
			const item = actor.items.get(spellId);
			if (!item) return;

			const dragData = {
				type: "Item",
				uuid: item.uuid,
				spellId,
				fromFolder: $(event.currentTarget).closest(".spell-folder").data("folder-id"),
				actorId: actor.id,
				isSpellFolderDrag: true
			};
			event.originalEvent.dataTransfer.setData("text/plain", JSON.stringify(dragData));
		});

		html.find(".spell-folder-header").attr("draggable", true).on("dragstart", (event) => {
			const folderId = $(event.currentTarget).data("folder-id");
			const dragData = { type: "SpellFolder", folderId, actorId: actor.id };
			event.originalEvent.dataTransfer.setData("text/plain", JSON.stringify(dragData));
		});

		html
			.find(".spell-folder, .loose-spells-container")
			.on("dragover", (event) => {
				event.preventDefault();
				$(event.currentTarget).addClass("drag-over");
			})
			.on("dragleave", (event) => {
				$(event.currentTarget).removeClass("drag-over");
			})
			.on("drop", async (event) => {
				event.preventDefault();
				$(event.currentTarget).removeClass("drag-over");

				try {
					const data = JSON.parse(event.originalEvent.dataTransfer.getData("text/plain"));
					if (data.actorId && data.actorId !== actor.id) return;

					const targetElement = $(event.currentTarget);
					const targetFolderId = targetElement.data("folder-id");

					if (data.type === "Item") {
						const spellId = data.spellId || (data.uuid ? data.uuid.split(".").pop() : null);
						if (!spellId) return;

						const item = actor.items.get(spellId);
						if (!item || item.type !== "magia") return; // só aceita magias

						if (targetFolderId) {
							if (window.SpellFolderManager) {
								await window.SpellFolderManager.addSpellToFolder(actor, targetFolderId, spellId);
								app.render(true);
							}
						} else if (targetElement.hasClass("loose-spells-container")) {
							if (window.SpellFolderManager) {
								const folders = window.SpellFolderManager.getFolders(actor);
								for (const folder of folders) {
									await window.SpellFolderManager.removeSpellFromFolder(actor, folder.id, spellId);
								}
								app.render(true);
							}
						}
					} else if (data.type === "SpellFolder" && targetFolderId && data.folderId !== targetFolderId) {
						if (window.SpellFolderManager) {
							await window.SpellFolderManager.reorderFolders(actor, data.folderId, targetFolderId);
							app.render(true);
						}
					}
				} catch (e) {
					console.warn("Agrupador de Magias | Falha no processamento do Drop:", e);
				}
			});
	}
}

export class PowerFolderInjector {
	static init() {}

	static injectControls(app, html, actor) {
		let powersSection = html.find(".tab.powers");
		if (powersSection.length === 0) powersSection = html.find(".list-powers");
		if (powersSection.length === 0) return;

		if (html.find(".toggle-power-folders").length === 0) {
			const headerControls = powersSection.find(".item-header .item-controls, .item-header").first();
			if (headerControls.length > 0) {
				const usePowerFolders = actor.getFlag(PODERES_FLAG_SCOPE, "usePowerFolders") || false;
				const toggleHtml = `
					<a class="item-control toggle-power-folders" title="${usePowerFolders ? "Desativar Agrupamento" : "Ativar Agrupamento"}">
						<i class="fas ${usePowerFolders ? "fa-toggle-on" : "fa-toggle-off"}"></i>
					</a>`;
				headerControls.prepend(toggleHtml);
			}
		}

		this.setupEventListeners(app, html, actor);
	}

	static setupEventListeners(app, html, actor) {
		const usePowerFolders = actor.getFlag(PODERES_FLAG_SCOPE, "usePowerFolders") || false;

		const clickSelectors =
			'.toggle-power-folders, .folder-create, .item-create, [data-action="toggle-folder"], ' +
			'[data-action="rename-folder"], [data-action="delete-folder"]';
		html.find(clickSelectors).off("click");

		if (usePowerFolders) {
			html.find(".power-item, .folder-header").off("dragstart").off("drop").off("dragover");
		}

		html.find(".toggle-power-folders").on("click", async (event) => {
			event.preventDefault();
			event.stopPropagation();
			const currentMode = actor.getFlag(PODERES_FLAG_SCOPE, "usePowerFolders") || false;
			await actor.setFlag(PODERES_FLAG_SCOPE, "usePowerFolders", !currentMode);
			app.render(true);
		});

		html.find(".folder-create").on("click", async (event) => {
			event.preventDefault();
			event.stopPropagation();
			if (window.PowerFolderManager) {
				await window.PowerFolderManager.promptCreateFolder(actor);
				app.render(true);
			}
		});

		html.find(".item-create").on("click", (event) => {
			if (typeof app._onItemCreate === "function") {
				app._onItemCreate(event);
			}
		});

		html.find('[data-action="toggle-folder"]').on("click", async (event) => {
			event.preventDefault();
			event.stopPropagation();
			const folderId =
				$(event.currentTarget).data("folder-id") ||
				$(event.currentTarget).closest(".folder-header").data("folder-id");
			if (window.PowerFolderManager && folderId) {
				await window.PowerFolderManager.toggleCollapse(actor, folderId);
				app.render(true);
			}
		});

		html.find('[data-action="rename-folder"]').on("click", async (event) => {
			event.preventDefault();
			event.stopPropagation();
			const folderElement = $(event.currentTarget).closest(".power-folder");
			const folderId = folderElement.data("folder-id");
			const folderName = folderElement.find(".folder-name").text();
			if (window.PowerFolderManager && folderId) {
				await window.PowerFolderManager.promptRenameFolder(actor, folderId, folderName);
				app.render(true);
			}
		});

		html.find('[data-action="delete-folder"]').on("click", async (event) => {
			event.preventDefault();
			event.stopPropagation();
			const folderId = $(event.currentTarget).closest(".power-folder").data("folder-id");

			const DialogV2 = foundry.applications?.api?.DialogV2 || Dialog;
			const confirm = await DialogV2.confirm({
				window: { title: "Excluir Agrupador" },
				content: "<p>Tem certeza que deseja excluir este agrupador? Os poderes não serão excluídos.</p>",
				modal: true,
				yes: { label: "Excluir", icon: "fas fa-trash" },
				no: { label: "Cancelar", icon: "fas fa-times" }
			});

			if (confirm && window.PowerFolderManager && folderId) {
				await window.PowerFolderManager.deleteFolder(actor, folderId);
				app.render(true);
			}
		});

		this.setupDragAndDrop(app, html, actor);
	}

	static setupDragAndDrop(app, html, actor) {
		const usePowerFolders = actor.getFlag(PODERES_FLAG_SCOPE, "usePowerFolders") || false;
		if (!usePowerFolders) return;

		html.find(".power-item").attr("draggable", true).on("dragstart", (event) => {
			const powerId = $(event.currentTarget).data("item-id");
			const item = actor.items.get(powerId);
			if (!item) return;

			const dragData = {
				type: "Item",
				uuid: item.uuid,
				powerId,
				fromFolder: $(event.currentTarget).closest(".power-folder").data("folder-id"),
				actorId: actor.id,
				isPowerFolderDrag: true
			};
			event.originalEvent.dataTransfer.setData("text/plain", JSON.stringify(dragData));
		});

		html.find(".folder-header").attr("draggable", true).on("dragstart", (event) => {
			const folderId = $(event.currentTarget).data("folder-id");
			const dragData = { type: "PowerFolder", folderId, actorId: actor.id };
			event.originalEvent.dataTransfer.setData("text/plain", JSON.stringify(dragData));
		});

		html
			.find(".power-folder, .loose-powers-container")
			.on("dragover", (event) => {
				event.preventDefault();
				$(event.currentTarget).addClass("drag-over");
			})
			.on("dragleave", (event) => {
				$(event.currentTarget).removeClass("drag-over");
			})
			.on("drop", async (event) => {
				event.preventDefault();
				$(event.currentTarget).removeClass("drag-over");

				try {
					const data = JSON.parse(event.originalEvent.dataTransfer.getData("text/plain"));
					if (data.actorId && data.actorId !== actor.id) return;

					const targetElement = $(event.currentTarget);
					const targetFolderId = targetElement.data("folder-id");

					if (data.type === "Item" || data.type === "PowerInFolder") {
						const powerId = data.powerId || (data.uuid ? data.uuid.split(".").pop() : null);
						if (!powerId) return;

						if (targetFolderId) {
							if (window.PowerFolderManager) {
								await window.PowerFolderManager.addPowerToFolder(actor, targetFolderId, powerId);
								app.render(true);
							}
						} else if (targetElement.hasClass("loose-powers-container")) {
							if (window.PowerFolderManager) {
								const folders = window.PowerFolderManager.getFolders(actor);
								for (const folder of folders) {
									await window.PowerFolderManager.removePowerFromFolder(actor, folder.id, powerId);
								}
								app.render(true);
							}
						}
					} else if (data.type === "PowerFolder" && targetFolderId && data.folderId !== targetFolderId) {
						if (window.PowerFolderManager) {
							await window.PowerFolderManager.reorderFolders(actor, data.folderId, targetFolderId);
							app.render(true);
						}
					}
				} catch (e) {
					console.warn("Agrupador de Poderes | Falha no processamento do Drop:", e);
				}
			});
	}
}
