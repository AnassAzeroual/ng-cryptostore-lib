# NgCyptoStore

This library was generated with [Angular CLI](https://github.com/angular/angular-cli) version 11.2.0.
to store data (string,object or array of abjects) in localstore or sessionstore with crypto-js package

## Table of Contents

- [Installation](#Installation)
- [Imports](#Imports)
- [Usage](#Usage)
- [Options](#Options)

## Installation

> this package require install crypto-js package

```js
npm i crypto-js@4.0.0 ng-cryptostore
```

## Imports and injections

```js
import { LocalstorageService,SessionstorageService } from 'ng-cryptostore';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {

  constructor(private srv:SessionstorageService){}

  ngOnInit(): void {
    this.srv.setItem('fruits',[{name:'fraise',icons:'🍓'},{name:'banane',icons:'🍌'}])
  }
}
```

> add to constructor :

```js
// you can use LocalstorageService or SessionstorageService
constructor(private srv: LocalstorageService) { }

```

## Usage

> (method) setItem(name: string, data: any, secret?: string): Promise<void>
> method 'setItem' store the data
> for example :

```js
// store array of objects crypted
const fruitsArray = [
  { name: "fraise", icons: "🍓" },
  { name: "banane", icons: "🍌" },
];
this.srv.setItem("fruitsArray", fruitsArray);

// store object crypted
this.srv.setItem("fruit", { name: "orange", icons: "🍊" });

// store strings crypted
this.srv.setItem("strings", "fruits: orange,fraise,banane and ...");

// store numbers crypted
this.srv.setItem("numbers", 1234567892121);
```

> (method) getItem(name: string, secret?: string): any
> method 'getItem' read the data
> for example :

```js
// get fruits array decrypted
console.log(this.srv.getItem("fruitsArray")); //  [{…}, {…}]

// get fruit object decrypted
console.log(this.srv.getItem("fruit")); //  {…}

// get fruit strings decrypted
console.log(this.srv.getItem("strings")); //  fruits: orange,fraise,banane and ...

// get numbers decrypted
console.log(this.srv.getItem("numbers")); //  1234567892121

// in case the item does not exist
console.log(this.srv.getItem("this_item_does_not_exist")); //  ""
```

> (method) awiatGetItem(name: string, secret?: string): Promise<any>
> method 'awiatGetItem' read the data with promise
> for example :

```js
// get data decrypted
this.srv.awiatGetItem("fruitsArray").then((res) => {
  console.log(res); // [{…}, {…}]
});

// Or

// get data decrypted
console.log(await this.srv.awiatGetItem("fruitsArray")); // [{…}, {…}]
```

> (method) check(name: string): boolean
> method 'check' check the existence of the key and the value
> for example :

```js
// check if this item exist
console.log(this.srv.check("fruit")); // true or false
```

> (method) removeItem(name: string): void
> method 'removeItem' remove one item by name
> for example :

```js
this.srv.removeItem("fruit");
```

> (method) clearAll(): void
> method 'clearAll' remove all items
> for example :

```js
this.srv.clearAll();
```

> (method) getItemLength(name: string, secret?: string): Promise<number>
> method 'getItemLength' decrypt and get length
> for example :

```js
console.log(this.srv.getItemLength("fruit")); // 21
```

## Options

> the secret is optional but if you used a custom secret in setItem you need to store it somewhere to use it later in getItem

```js
// set data crypted with token !secret token @123456
this.srv.setItem(
  "fruits",
  [{ name: "orange", icons: "🍊" }],
  "!secret token @123456"
);

// get data decrypted with token !secret token @123456
this.srv.awiatGetItem("fruits", "!secret token @123456").then((res) => {
  console.log(res); // [{…}]
});
```
