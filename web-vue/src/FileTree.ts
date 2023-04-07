export interface FileInfo {
  "*type": string;
  "*hide"?: boolean;
  path: string;
  size: string;
}
export interface DirectoryInfo {
  "*hide"?: boolean;
  [name: string]: FileInfo | DirectoryInfo | any;
}