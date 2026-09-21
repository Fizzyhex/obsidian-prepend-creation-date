import { Plugin, Notice, TFile } from "obsidian";

function formatDate(timestamp) {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default class PrependCreationDatePlugin extends Plugin {
  async onload() {
    const addMenuItem = (menu, files) => {
      const notes = files.filter((file) => file instanceof TFile && file.extension === "md");
      if (notes.length === 0) return;

      menu.addItem((item) => {
        item
          .setTitle("Prepend Creation Date")
          .setIcon("calendar-plus")
          .onClick(async () => {
            if (notes.length > 4 && !window.confirm(`Prepend creation dates to ${notes.length} selected notes?`)) {
              return;
            }
            await renameNotes(notes);
          });
      });
    };

    const renameNotes = async (notes) => {
      let renamed = 0;
      let skipped = 0;
      let failed = 0;

      for (const file of notes) {
        const creationDate = formatDate(file.stat.ctime);
        if (file.basename === creationDate || file.basename.startsWith(`${creationDate} `)) {
          skipped++;
          continue;
        }

        const folder = file.parent.path ? `${file.parent.path}/` : "";
        const newPath = `${folder}${creationDate} ${file.name}`;

        try {
          await this.app.fileManager.renameFile(file, newPath);
          renamed++;
        } catch (error) {
          console.error("Prepend Creation Date failed", error);
          failed++;
        }
      }

      const summary = [`Renamed ${renamed} note${renamed === 1 ? "" : "s"}`];
      if (skipped > 0) summary.push(`skipped ${skipped} already dated`);
      if (failed > 0) summary.push(`failed ${failed}`);
      new Notice(summary.join(", ") + ".");
    };

    this.registerEvent(this.app.workspace.on("file-menu", (menu, file) => {
      addMenuItem(menu, [file]);
    }));

    this.registerEvent(this.app.workspace.on("files-menu", (menu, files) => {
      addMenuItem(menu, files);
    }));

    this.addCommand({
      id: "prepend-creation-date",
      name: "Prepend Creation Date",
      callback: async () => {
        const file = this.app.workspace.getActiveFile();

        if (!(file instanceof TFile)) {
          new Notice("Open a note before running this command.");
          return;
        }

        await renameNotes([file]);
      }
    });
  }
};
