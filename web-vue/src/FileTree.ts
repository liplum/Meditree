export interface File {
  "*type": string;
  "*hide"?: boolean;
  path: string;
  size: string;
}
export interface Directory {
  "*hide"?: boolean;
  [name: string]: File | Directory | any;
}