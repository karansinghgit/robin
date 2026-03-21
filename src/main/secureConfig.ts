import { app, safeStorage } from "electron";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { CLOUD_PROVIDER_IDS, CloudProviderId } from "../shared/contracts";

interface SecretFile {
  providerApiKeys?: Partial<Record<CloudProviderId, string>>;
  toolApiKeys?: Record<string, string>;
  perplexityApiKey?: string;
}

interface NormalizedSecretFile {
  providerApiKeys: Partial<Record<CloudProviderId, string>>;
  toolApiKeys: Record<string, string>;
}

export class SecureConfig {
  private readonly rootDir = path.join(app.getPath("userData"), "secure");
  private readonly filePath = path.join(this.rootDir, "secrets.json");

  async init(): Promise<void> {
    await mkdir(this.rootDir, { recursive: true });
    try {
      await readFile(this.filePath, "utf8");
    } catch {
      await this.writeSecrets({ providerApiKeys: {}, toolApiKeys: {} });
    }
  }

  async hasPerplexityApiKey(): Promise<boolean> {
    return this.hasProviderApiKey("perplexity");
  }

  async getPerplexityApiKey(): Promise<string | null> {
    return this.getProviderApiKey("perplexity");
  }

  async setPerplexityApiKey(apiKey: string): Promise<void> {
    await this.setProviderApiKey("perplexity", apiKey);
  }

  async hasProviderApiKey(provider: CloudProviderId): Promise<boolean> {
    const secrets = await this.readSecrets();
    return Boolean(secrets.providerApiKeys[provider]);
  }

  async getProviderApiKey(provider: CloudProviderId): Promise<string | null> {
    const secrets = await this.readSecrets();
    const encoded = secrets.providerApiKeys[provider];
    if (!encoded) {
      return null;
    }
    this.assertEncryption();
    const decrypted = safeStorage.decryptString(Buffer.from(encoded, "base64"));
    return decrypted.trim() || null;
  }

  async setProviderApiKey(
    provider: CloudProviderId,
    apiKey: string
  ): Promise<void> {
    this.assertEncryption();
    const secrets = await this.readSecrets();
    const encrypted = safeStorage
      .encryptString(apiKey.trim())
      .toString("base64");
    secrets.providerApiKeys[provider] = encrypted;
    await this.writeSecrets(secrets);
  }

  async clearProviderApiKey(provider: CloudProviderId): Promise<void> {
    const secrets = await this.readSecrets();
    delete secrets.providerApiKeys[provider];
    await this.writeSecrets(secrets);
  }

  async getConfiguredProviderMap(): Promise<Record<CloudProviderId, boolean>> {
    const secrets = await this.readSecrets();
    return CLOUD_PROVIDER_IDS.reduce(
      (result, providerId) => {
        result[providerId] = Boolean(secrets.providerApiKeys[providerId]);
        return result;
      },
      {} as Record<CloudProviderId, boolean>
    );
  }

  async getProviderApiKeys(): Promise<Record<CloudProviderId, string>> {
    const secrets = await this.readSecrets();

    if (!safeStorage.isEncryptionAvailable()) {
      return CLOUD_PROVIDER_IDS.reduce(
        (result, providerId) => {
          result[providerId] = "";
          return result;
        },
        {} as Record<CloudProviderId, string>
      );
    }

    return CLOUD_PROVIDER_IDS.reduce(
      (result, providerId) => {
        const encoded = secrets.providerApiKeys[providerId];
        if (!encoded) {
          result[providerId] = "";
          return result;
        }

        try {
          const decrypted = safeStorage.decryptString(
            Buffer.from(encoded, "base64")
          );
          result[providerId] = decrypted.trim();
        } catch {
          result[providerId] = "";
        }
        return result;
      },
      {} as Record<CloudProviderId, string>
    );
  }

  async getToolApiKey(name: string): Promise<string | null> {
    const secrets = await this.readSecrets();
    const encoded = secrets.toolApiKeys[name];
    if (!encoded) return null;
    this.assertEncryption();
    const decrypted = safeStorage.decryptString(Buffer.from(encoded, "base64"));
    return decrypted.trim() || null;
  }

  async setToolApiKey(name: string, key: string): Promise<void> {
    this.assertEncryption();
    const secrets = await this.readSecrets();
    secrets.toolApiKeys[name] = safeStorage
      .encryptString(key.trim())
      .toString("base64");
    await this.writeSecrets(secrets);
  }

  private normalizeSecrets(raw: SecretFile): NormalizedSecretFile {
    const providerApiKeys: Partial<Record<CloudProviderId, string>> = {
      ...(raw.providerApiKeys ?? {})
    };

    if (raw.perplexityApiKey && !providerApiKeys.perplexity) {
      providerApiKeys.perplexity = raw.perplexityApiKey;
    }

    return { providerApiKeys, toolApiKeys: raw.toolApiKeys ?? {} };
  }

  private async readSecrets(): Promise<NormalizedSecretFile> {
    try {
      const raw = await readFile(this.filePath, "utf8");
      return this.normalizeSecrets(JSON.parse(raw) as SecretFile);
    } catch {
      return { providerApiKeys: {}, toolApiKeys: {} };
    }
  }

  private async writeSecrets(secrets: NormalizedSecretFile): Promise<void> {
    await writeFile(this.filePath, JSON.stringify(secrets, null, 2), "utf8");
  }

  private assertEncryption(): void {
    if (!safeStorage.isEncryptionAvailable()) {
      throw new Error(
        "System encryption is not available. Robin cannot store API keys securely on this device."
      );
    }
  }
}
