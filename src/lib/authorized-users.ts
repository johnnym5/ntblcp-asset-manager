
export interface AuthorizedUser {
  displayName: string;
  loginName: string;
  states: string[];
  isAdmin: boolean;
}

// Note: loginName should be lowercase for case-insensitive matching.
export const AUTHORIZED_USERS: AuthorizedUser[] = [
  { displayName: "Ann Okagbue", loginName: "ann", states: ["NTBLCP-PMU"], isAdmin: true },
  { displayName: "Steve", loginName: "steve", states: ["Kogi", "Kano"], isAdmin: true },
  { displayName: "Kodili", loginName: "kodili", states: ["Ogun", "Lagos"], isAdmin: true },
  { displayName: "Emeka OAGF", loginName: "emeka oagf", states: ["Benue", "Akwa Ibom"], isAdmin: false },
  { displayName: "Seyi", loginName: "seyi", states: ["Anambra"], isAdmin: false },
  { displayName: "Margaret", loginName: "margaret", states: ["Delta"], isAdmin: false },
  { displayName: "Samuel", loginName: "samuel", states: ["Ekiti"], isAdmin: false },
  { displayName: "Mrs Victoria", loginName: "mrs victoria", states: ["Osun"], isAdmin: false },
  { displayName: "Concilia", loginName: "concilia", states: ["Bayelsa"], isAdmin: false },
  { displayName: "Praise", loginName: "praise", states: ["Rivers"], isAdmin: false },
  { displayName: "Shallom", loginName: "shallom", states: ["Jigawa"], isAdmin: false },
  { displayName: "Bassey", loginName: "bassey", states: ["Bauchi"], isAdmin: false },
  { displayName: "JohnMary", loginName: "johnmary", states: ["Gombe"], isAdmin: false },
  { displayName: "Isah", loginName: "isah", states: ["Cross River"], isAdmin: false },
  { displayName: "Pelumi", loginName: "pelumi", states: ["Kwara"], isAdmin: false },
  { displayName: "Gift", loginName: "gift", states: ["Imo"], isAdmin: false },
  { displayName: "Kemi", loginName: "kemi", states: ["Abia"], isAdmin: false },
  { displayName: "Chidera", loginName: "chidera", states: ["Enugu"], isAdmin: false },
  { displayName: "Franscisca", loginName: "franscisca", states: ["Ebonyi"], isAdmin: false },
  { displayName: "Sani", loginName: "sani", states: ["Borno"], isAdmin: false },
  { displayName: "Mrs Angelina", loginName: "mrs angelina", states: ["Yobe"], isAdmin: false },
  { displayName: "Louis", loginName: "louis", states: ["Katsina"], isAdmin: false },
  { displayName: "Mrs Angabs", loginName: "mrs angabs", states: ["Zamfara"], isAdmin: false },
  { displayName: "Nnaemeka", loginName: "nnaemeka", states: ["Adamawa"], isAdmin: false },
  { displayName: "Habila", loginName: "habila", states: ["Taraba"], isAdmin: false },
  { displayName: "Peace", loginName: "peace", states: ["Sokoto"], isAdmin: false },
  { displayName: "Lafarma", loginName: "lafarma", states: ["Kebbi"], isAdmin: false },
  { displayName: "Kyautau", loginName: "kyautau", states: ["Kaduna"], isAdmin: false },
  { displayName: "Chidozie", loginName: "chidozie", states: ["Niger"], isAdmin: false },
  { displayName: "Ibeku", loginName: "ibeku", states: ["Edo"], isAdmin: false },
  { displayName: "Rebecca", loginName: "rebecca", states: ["Ondo"], isAdmin: false },
  { displayName: "Ude", loginName: "ude", states: ["Oyo"], isAdmin: false },
  { displayName: "Janet", loginName: "janet", states: ["Plateau"], isAdmin: false },
  { displayName: "Mrs Bala", loginName: "mrs bala", states: ["Nasarawa"], isAdmin: false },
];
