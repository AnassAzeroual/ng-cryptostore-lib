import { Component, OnInit, inject } from '@angular/core';
import { IntegrityError, StorageService } from 'ng-cryptostore';

@Component({
  selector: 'app-localstore',
  standalone: true,
  templateUrl: './localstore.component.html',
  styleUrls: ['./localstore.component.scss']
})
export class LocalstoreComponent implements OnInit {
  showData: string = "";
  showDataAsync: string = "";
  showDataCrypted: string | null = "";
  showKeys: string[] = [];
  private srv = inject(StorageService);

  ngOnInit() { }

  save(data: string) {
    this.srv.set('text', data).then(() => {
      this.show()
      this.read()
      this.readAwait()
      this.listKeys()
    })
  }

  show() {
    this.showDataCrypted = this.srv.getEncrypted('text');
  }

  read() {
    this.showData = this.format(this.srv.get('text'));
  }

  async readAwait() {
    this.showDataAsync = this.format(await this.srv.asyncGet('text'));
  }

  private format(value: unknown): string {
    if (value === '' || value === null || value === undefined) return String(value ?? '');
    return typeof value === 'string' ? value : JSON.stringify(value);
  }

  async listKeys() {
    this.showKeys = await this.srv.keys();
  }

  async asyncCheck() {
    console.log('asyncCheck("text") =', await this.srv.asyncCheck('text'));
  }

  async removeItem(name: string) {
    await this.srv.remove(name || 'text');
    this.showKeys = await this.srv.keys();
  }

  async removeAll() {
    await this.srv.clearAll();
    this.showKeys = await this.srv.keys();
  }

  check() {
    console.log(this.srv.check('text'));
  }

  async awiatGetItem() {
    console.log(await this.srv.asyncGet('text'));
  }

  getItem() {
    console.log(this.srv.get('text'));
  }

  async getLength() {
    // Decrypted size: characters for a string, items for an array, keys for an object.
    console.log('length of "text" =', await this.srv.getItemLength('text'));
  }

  async crypt() {
    console.log(await this.srv.crypt([
      { name: "fraise", icons: "🍓" },
      { name: "banana", icons: "🍌" },
    ]));
  }

  async decrypt() {
    console.log(await this.srv.decrypt(await this.srv.crypt([
      { name: "fraise", icons: "🍓" },
      { name: "banana", icons: "🍌" },
    ])));
  }

  /**
   * Demonstrates the tamper detection of the new payload format: a single character of the
   * stored (encrypted) cookie is flipped and reading the value now fails with an
   * IntegrityError instead of returning silently corrupted data.
   */
  async tamperTest() {
    const payload = this.srv.getEncrypted('text');
    if (!payload) {
      console.warn('Store a value first.');
      return;
    }
    const index = Math.floor(payload.length / 2);
    const flipped = payload.slice(0, index) + (payload[index] === 'A' ? 'B' : 'A') + payload.slice(index + 1);
    document.cookie = `text=${flipped}; path=/`;

    try {
      await this.srv.asyncGet('text');
      console.warn('Tampering was NOT detected (unexpected).');
    } catch (error) {
      if (error instanceof IntegrityError) {
        console.log('Tampering detected ✔', error.message);
      } else {
        console.error(error);
      }
    }
  }

}
