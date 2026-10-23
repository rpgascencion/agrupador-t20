// IMPORTANTE: precisa ser o id de um módulo/sistema ATIVO. O Foundry valida
// isso em getFlag/setFlag e rejeita qualquer scope que não seja "core", o id
// do sistema, ou um módulo atualmente ativo — por isso não pode mais ser
// "agrupador-magias-t20" (módulo antigo, hoje substituído por este).
const MOD_ID = "agrupador-t20";

export default class SpellFolderManager {
	static initializeFolders(actor) {
		if (!actor.getFlag(MOD_ID, "spellFolders")) {
			actor.setFlag(MOD_ID, "spellFolders", []);
		}
	}

	static getFolders(actor) {
		return actor.getFlag(MOD_ID, "spellFolders") || [];
	}

	static async createFolder(actor, name = "Nova Pasta", color = "") {
		const folders = this.getFolders(actor);
		const newFolder = {
			id: foundry.utils.randomID(),
			name,
			color,
			collapsed: false,
			order: folders.length,
			spells: []
		};
		folders.push(newFolder);
		return actor.setFlag(MOD_ID, "spellFolders", folders);
	}

	static async renameFolder(actor, folderId, newName, color) {
		const folders = this.getFolders(actor);
		const folder = folders.find((f) => f.id === folderId);
		if (folder) {
			folder.name = newName;
			if (color !== undefined) folder.color = color;
			return actor.setFlag(MOD_ID, "spellFolders", folders);
		}
	}

	static async deleteFolder(actor, folderId) {
		const folders = this.getFolders(actor);
		const idx = folders.findIndex((f) => f.id === folderId);
		if (idx !== -1) {
			folders.splice(idx, 1);
			return actor.setFlag(MOD_ID, "spellFolders", folders);
		}
	}

	static async toggleCollapse(actor, folderId) {
		const folders = this.getFolders(actor);
		const folder = folders.find((f) => f.id === folderId);
		if (folder) {
			folder.collapsed = !folder.collapsed;
			return actor.setFlag(MOD_ID, "spellFolders", folders);
		}
	}

	static async reorderFolders(actor, sourceId, targetId) {
		const folders = this.getFolders(actor);
		const sourceIndex = folders.findIndex((f) => f.id === sourceId);
		const targetIndex = folders.findIndex((f) => f.id === targetId);

		if (sourceIndex !== -1 && targetIndex !== -1) {
			const [movedFolder] = folders.splice(sourceIndex, 1);
			folders.splice(targetIndex, 0, movedFolder);
			folders.forEach((f, i) => (f.order = i));
			return actor.setFlag(MOD_ID, "spellFolders", folders);
		}
	}

	static async addSpellToFolder(actor, folderId, spellId) {
		const folders = this.getFolders(actor);
		folders.forEach((f) => {
			const idx = f.spells.indexOf(spellId);
			if (idx !== -1) f.spells.splice(idx, 1);
		});

		const targetFolder = folders.find((f) => f.id === folderId);
		if (targetFolder && !targetFolder.spells.includes(spellId)) {
			targetFolder.spells.push(spellId);
		}
		return actor.setFlag(MOD_ID, "spellFolders", folders);
	}

	static async removeSpellFromFolder(actor, folderId, spellId) {
		const folders = this.getFolders(actor);
		const folder = folders.find((f) => f.id === folderId);
		if (folder) {
			const idx = folder.spells.indexOf(spellId);
			if (idx !== -1) {
				folder.spells.splice(idx, 1);
				return actor.setFlag(MOD_ID, "spellFolders", folders);
			}
		}
	}

	/**
	 * Monta, para um dado predicado de filtro (id da magia -> bool), uma cópia
	 * de actor.magias — que é um OBJETO indexado por número de círculo
	 * (ex: {1: {spells:[], custo:1}, 2: {...}, ...}, montado em
	 * actor-character.mjs), não um Array. Mantém círculo/custo, mas com
	 * "spells" restrito ao filtro. Isso é o que preserva a organização por
	 * Círculo dentro de cada pasta.
	 */
	static _organizarPorCirculo(magiasPorCirculo, filtro) {
		const fonte = magiasPorCirculo || {};
		const resultado = {};
		for (const [circulo, dados] of Object.entries(fonte)) {
			resultado[circulo] = {
				...dados,
				spells: (dados?.spells || []).filter(filtro)
			};
		}
		return resultado;
	}

	static prepareActorData(actor, data) {
		const folders = this.getFolders(actor);

		const magiasPorCirculo = data.actor?.magias ?? actor.system?.magias ?? {};

		const folderIdDaMagia = new Map();
		folders.forEach((f) => f.spells.forEach((id) => folderIdDaMagia.set(id, f.id)));

		const organized = folders
			.slice()
			.sort((a, b) => (a.order || 0) - (b.order || 0))
			.map((f) => ({
				...f,
				magiasPorCirculo: this._organizarPorCirculo(
					magiasPorCirculo,
					(m) => folderIdDaMagia.get(m._id || m.id) === f.id
				)
			}));

		const looseMagiasPorCirculo = this._organizarPorCirculo(
			magiasPorCirculo,
			(m) => !folderIdDaMagia.has(m._id || m.id)
		);

		if (!data.actor) data.actor = {};
		data.actor.spellFolders = organized;
		data.actor.looseMagiasPorCirculo = looseMagiasPorCirculo;
		data.useSpellFolders = actor.getFlag(MOD_ID, "useSpellFolders") || false;
	}

	static async promptCreateFolder(actor) {
		const DialogV2 = foundry.applications?.api?.DialogV2 || Dialog;
		const content = `
			<div class="form-group">
				<label>Nome da Pasta:</label>
				<input type="text" name="folderName" value="Nova Pasta" autofocus/>
			</div>
			<div class="form-group">
				<label>Cor da Pasta:</label>
				<div style="display: flex; gap: 8px; align-items: center;">
					<input type="color" name="folderColor" value="#7048e8" style="width: 60px; height: 30px; border:none; background:none;"/>
					<input type="checkbox" name="noColor" id="noColorSpell" style="width: auto;"/>
					<label for="noColorSpell" style="flex: 1; margin: 0;">Sem cor</label>
				</div>
			</div>`;

		return DialogV2.confirm({
			window: { title: "Criar Pasta de Magias" },
			content,
			modal: true,
			yes: {
				label: "Criar",
				icon: "fas fa-check",
				callback: async (event, button, dialog) => {
					const html = dialog.element;
					const name = html.querySelector('[name="folderName"]').value;
					const noColor = html.querySelector('[name="noColor"]').checked;
					const color = noColor ? "" : html.querySelector('[name="folderColor"]').value;
					await this.createFolder(actor, name, color);
					return true;
				}
			},
			no: { label: "Cancelar", icon: "fas fa-times" },
			defaultYes: true
		});
	}

	static async promptRenameFolder(actor, folderId, currentName) {
		const DialogV2 = foundry.applications?.api?.DialogV2 || Dialog;
		const folders = this.getFolders(actor);
		const folder = folders.find((f) => f.id === folderId);
		const currentColor = folder?.color || "#7048e8";

		const content = `
			<div class="form-group">
				<label>Nome da Pasta:</label>
				<input type="text" name="folderName" value="${currentName}" autofocus/>
			</div>
			<div class="form-group">
				<label>Cor da Pasta:</label>
				<div style="display: flex; gap: 8px; align-items: center;">
					<input type="color" name="folderColor" value="${currentColor}" style="width: 60px; height: 30px; border:none; background:none;"/>
					<input type="checkbox" name="noColor" id="noColorSpell" ${!folder?.color ? "checked" : ""} style="width: auto;"/>
					<label for="noColorSpell" style="flex: 1; margin: 0;">Sem cor</label>
				</div>
			</div>`;

		return DialogV2.confirm({
			window: { title: "Renomear Pasta de Magias" },
			content,
			modal: true,
			yes: {
				label: "Salvar",
				icon: "fas fa-save",
				callback: async (event, button, dialog) => {
					const html = dialog.element;
					const name = html.querySelector('[name="folderName"]').value;
					const noColor = html.querySelector('[name="noColor"]').checked;
					const color = noColor ? "" : html.querySelector('[name="folderColor"]').value;
					await this.renameFolder(actor, folderId, name, color);
					return true;
				}
			},
			no: { label: "Cancelar", icon: "fas fa-times" },
			defaultYes: true
		});
	}
}
