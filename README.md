# NgCyptoStore

This library was generated with [Angular CLI](https://github.com/angular/angular-cli) version 14.2.10.
to store data (string, object or array of objects) in local stores or the session store with crypto-js package

## Table of Contents

- [Declaration](#Declaration)
- [Imports and injections](#Imports-and-injections)
- [All Functions](#All-Fuctions)
- [Usage](#Usage)
- [Options](#Options)

## Declaration

```js
...
import { StorageModule } from 'ng-cryptostore';

@NgModule({
  declarations: [
    ...
  ],
  imports: [
    ...
    // ( localStorage | sessionStorage | cookies )
    StorageModule.withConfig({ storageType: "localStorage" })
  ],
  providers: [...],
  bootstrap: [...]
})
export class AppModule { }
```

## Imports and injections

```js
import { StorageService } from 'ng-cryptostore';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {

  constructor(private store:StorageService){} // <---- dependency injection (DI)

  ngOnInit(): void {
    this.store.set('fruits',[{name:'fraise',icons:'🍓'},{name:'banana',icons:'🍌'}])
  }
}
```

## All Functions

```js
set(name: string, data: any, secret?: string): Promise<void>;
get(name: string, secret?: string): any;
asyncGet(name: string, secret?: string): Promise<any>;
getEncrypted(name: string): any
remove(name: string): void;
check(name: string): boolean;
getItemLength(name: string, secret?: string): Promise<number>;
clearAll(): void;
crypt(data: any, secret?: string): Promise<any>;
decrypt(scripts: string, secret?: string): Promise<any>;
```

## Usage

> (method) set(name: string, data: any, secret?: string): Promise<void>

> method 'set' store the data
> for example :

```js
// store array of objects encrypted
const fruitsArray = [
  { name: "fraise", icons: "🍓" },
  { name: "banana", icons: "🍌" },
];
this.store.set("fruitsArray", fruitsArray);

// store object encrypted
this.store.set("fruit", { name: "orange", icons: "🍊" });

// store string encrypted
this.store.set("strings", "fruits: orange,fraise,banana and ...");

// store numbers encrypted
this.store.set("numbers", 1234567892121);
```

> (method) get(name: string, secret?: string): any

> method 'get' read the data
> for example :

```js
// get fruits array decrypted
console.log(this.store.get("fruitsArray")); //  [{…}, {…}]

// get fruit object decrypted
console.log(this.store.get("fruit")); //  {…}

// get fruit strings decrypted
console.log(this.store.get("strings")); //  fruits: orange,fraise,banana and ...

// get numbers decrypted
console.log(this.store.get("numbers")); //  1234567892121

// in case the item does not exist
console.log(this.store.get("this_item_does_not_exist")); //  ""
```

> (method) asyncGet(name: string, secret?: string): Promise<any>

> method 'asyncGet' read the data with promise
> for example :

```js
// get data decrypted
this.store.asyncGet("fruitsArray").then((res) => {
  console.log(res); // [{…}, {…}]
});

// Or

// get data decrypted
console.log(await this.store.asyncGet("fruitsArray")); // [{…}, {…}]
```

> (method) getEncrypted(name: string): any

> method 'getEncrypted' read the data
> for example :

```js
// get data encrypted
console.log(this.store.getEncrypted("fruitsArray")); // U2FsdGVkX18lKfMIr8dpIGGLy...
```

> (method) check(name: string): boolean

> method 'check' check the existence of the key and the value
> for example :

```js
// check if this item exist, if exist return true
console.log(this.store.check("fruit")); // true or false
```

> (method) remove(name: string): void

> method 'remove' remove one item by name
> for example :

```js
this.store.remove("fruit");
```

> (method) clearAll(): void

> method 'clearAll' remove all items
> for example :

```js
this.store.clearAll();
```

> (method) getItemLength(name: string, secret?: string): Promise<number>

> method 'getItemLength' decrypt and get length
> for example :

```js
console.log(this.store.getItemLength("fruit")); // 21
```

> (method) crypt(data: any, secret?: string): Promise<any>

> method 'crypt' return data encrypted
> for example :

```js
const data = [
  { name: "fraise", icons: "🍓" },
  { name: "banana", icons: "🍌" },
];

console.log(await this.store.crypt(data)); // U2FsdGVkX18lKfMIr8dpIGGLy...
```

> (method) decrypt(scripts: string, secret?: string): Promise<any>

> method 'decrypt' return data decrypted
> for example :

```js
const dataEncrypted = "U2FsdGVkX18lKfMIr8dpIGGLy...";

console.log(await this.store.decrypt(dataEncrypted)); // [{ name: "fraise", icons: "🍓" },{ name: "banana", icons: "🍌"}]
```

## Options

> the secret is optional but if you used a custom secret in setItem you need to store it somewhere to use it later in getItem

```js
// set data encrypted with token !secret token @123456
this.store.set(
  "fruits",
  [{ name: "orange", icons: "🍊" }],
  "!secret token @123456"
);

// get data using token "!secret token @123456"

this.store.asyncGet("fruits", "!secret token @123456").then((res) => {
  console.log(res); // [{…}]
});

console.log(this.store.get("fruits", "!secret token @123456")); //  [{…}, {…}]

console.log(this.store.getItemLength("fruit", "!secret token @123456")); // 1
```
