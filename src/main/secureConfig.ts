import { app, safeStorage } from "electron";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

interface SecretFile {
  perplexityApiKey?: string;
}

export class SecureConfig {
  private readonly rootDir = path.join(app.getPath("userData"), "secure");
  private readonly filePath = path.join(this.rootDir, "secrets.json");

  async init(): Promise<void> {
    await mkdir(this.rootDir, { recursive: true });
    try {
      await readFile(this.filePath, "utf8");
    } catch {
      await this.writeSecrets({});
    }
  }

  async hasPerplexityApiKey(): Promise<boolean> {
    const secrets = await this.readSecrets();
    return Boolean(secrets.perplexityApiKey);
  }

  async getPerplexityApiKey(): Promise<string | null> {
    const secrets = await this.readSecrets();
    const encoded = secrets.perplexityApiKey;
    if (!encoded) {
      return null;
    }
    this.assertEncryption();
    const decrypted = safeStorage.decryptString(Buffer.from(encoded, "base64"));
    return decrypted.trim() || null;
  }

  async setPerplexityApiKey(apiKey: string): Promise<void> {
    this.assertEncryption();
    const secrets = await this.readSecrets();
    const encrypted = safeStorage.encryptString(apiKey.trim()).toString("base64");
    secrets.perplexityApiKey = encrypted;
    await this.writeSecrets(secrets);
  }

  private async readSecrets(): Promise<SecretFile> {
    try {
      const raw = await readFile(this.filePath, "utf8");
      return JSON.parse(raw) as SecretFile;
    } catch {
      return {};
    }
  }

  private async writeSecrets(secrets: SecretFile): Promise<void> {
    await writeFile(this.filePath, JSON.stringify(secrets, null, 2), "utf8");
  }

  private assertEncryption(): void {
    if (!safeStorage.isEncryptionAvailable()) {
      throw new Error("System encryption is not available. Robin cannot store API keys securely on this device.");
    }
  }
}
