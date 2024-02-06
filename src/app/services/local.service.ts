import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class LocalService {
  constructor() {}

  public saveData(key: string, value: object): void {
    localStorage.setItem(key, JSON.stringify(value));
  }

  public getData(key: string): object | null {
    return localStorage.getItem(key) ? JSON.parse(localStorage.getItem(key) as string) : null;
  }
  public removeData(key: string): void {
    localStorage.removeItem(key);
  }

  public clearData(): void {
    localStorage.clear();
  }
}
