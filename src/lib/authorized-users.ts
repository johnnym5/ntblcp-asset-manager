
export interface AuthorizedUser {
  displayName: string;
  loginName: string;
  states: string[];
  isAdmin: boolean;
  isGuest?: boolean;
  password?: string;
  passwordChanged?: boolean;
  canAddAssets?: boolean;
  canEditAssets?: boolean;
}

const ALL_STATES = [
  "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue", "Borno",
  "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu", "FCT - Abuja", "Gombe",
  "Imo", "Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi", "Kwara", "Lagos",
  "Nasarawa", "Niger", "Ogun", "Ondo", "Osun", "Oyo", "Plateau", "Rivers", "Sokoto",
  "Taraba", "Yobe", "Zamfara", "NTBLCP-PMU"
];


// Note: loginName should be lowercase for case-insensitive matching.
export const AUTHORIZED_USERS: AuthorizedUser[] = [
  { displayName: "Guest", loginName: "guest", states: ALL_STATES, isAdmin: false, isGuest: true, password: "0000", passwordChanged: true, canAddAssets: false, canEditAssets: false },
  { displayName: "Admin", loginName: "admin", states: ["All"], isAdmin: true, password: "0000", passwordChanged: false, canAddAssets: true, canEditAssets: true },
  { displayName: "Ann Okagbue", loginName: "ann okagbue", states: ["NTBLCP-PMU"], isAdmin: true, password: "0000", passwordChanged: false, canAddAssets: true, canEditAssets: true },
  { displayName: "Emeka OAGF", loginName: "emeka oagf", states: ["Benue", "Akwa Ibom"], isAdmin: false, password: "0000", passwordChanged: false, canAddAssets: false, canEditAssets: false },
  { displayName: "Steve", loginName: "steve", states: ["Rivers", "Kano"], isAdmin: true, password: "0000", passwordChanged: false, canAddAssets: true, canEditAssets: true },
  { displayName: "Seyi", loginName: "seyi", states: ["Anambra"], isAdmin: false, password: "0000", passwordChanged: false, canAddAssets: false, canEditAssets: false },
  { displayName: "Margaret", loginName: "margaret", states: ["Delta"], isAdmin: false, password: "0000", passwordChanged: false, canAddAssets: false, canEditAssets: false },
  { displayName: "Samuel", loginName: "samuel", states: ["Ekiti"], isAdmin: false, password: "0000", passwordChanged: false, canAddAssets: false, canEditAssets: false },
  { displayName: "Victoria", loginName: "victoria", states: ["Osun"], isAdmin: false, password: "0000", passwordChanged: false, canAddAssets: false, canEditAssets: false },
  { displayName: "Concilia", loginName: "concilia", states: ["Bayelsa"], isAdmin: false, password: "0000", passwordChanged: false, canAddAssets: false, canEditAssets: false },
  { displayName: "Praise", loginName: "praise", states: ["Kogi"], isAdmin: false, password: "0000", passwordChanged: false, canAddAssets: false, canEditAssets: false },
  { displayName: "Shallom", loginName: "shallom", states: ["Jigawa"], isAdmin: false, password: "0000", passwordChanged: false, canAddAssets: false, canEditAssets: false },
  { displayName: "Bassey", loginName: "bassey", states: ["Bauchi"], isAdmin: false, password: "0000", passwordChanged: false, canAddAssets: false, canEditAssets: false },
  { displayName: "Johnmary", loginName: "johnmary", states: ["Gombe"], isAdmin: false, password: "0000", passwordChanged: false, canAddAssets: false, canEditAssets: false },
  { displayName: "Isah", loginName: "isah", states: ["Cross River"], isAdmin: false, password: "0000", passwordChanged: false, canAddAssets: false, canEditAssets: false },
  { displayName: "Akintunde", loginName: "akintunde", states: ["Kwara"], isAdmin: false, password: "0000", passwordChanged: false, canAddAssets: false, canEditAssets: false },
  { displayName: "Kodili", loginName: "kodili", states: ["Ogun", "Lagos"], isAdmin: true, password: "0000", passwordChanged: false, canAddAssets: true, canEditAssets: true },
  { displayName: "Gift", loginName: "gift", states: ["Imo"], isAdmin: false, password: "0000", passwordChanged: false, canAddAssets: false, canEditAssets: false },
  { displayName: "Kemi", loginName: "kemi", states: ["Abia"], isAdmin: false, password: "0000", passwordChanged: false, canAddAssets: false, canEditAssets: false },
  { displayName: "Chidera", loginName: "chidera", states: ["Enugu"], isAdmin: false, password: "0000", passwordChanged: false, canAddAssets: false, canEditAssets: false },
  { displayName: "Francisca", loginName: "francisca", states: ["Ebonyi"], isAdmin: false, password: "0000", passwordChanged: false, canAddAssets: false, canEditAssets: false },
  { displayName: "Sani", loginName: "sani", states: ["Borno"], isAdmin: false, password: "0000", passwordChanged: false, canAddAssets: false, canEditAssets: false },
  { displayName: "Angelina", loginName: "angelina", states: ["Yobe"], isAdmin: false, password: "0000", passwordChanged: false, canAddAssets: false, canEditAssets: false },
  { displayName: "Louis", loginName: "louis", states: ["Katsina"], isAdmin: false, password: "0000", passwordChanged: false, canAddAssets: false, canEditAssets: false },
  { displayName: "Angabs", loginName: "angabs", states: ["Zamfara"], isAdmin: false, password: "0000", passwordChanged: false, canAddAssets: false, canEditAssets: false },
  { displayName: "Nnaemeka", loginName: "nnaemeka", states: ["Adamawa"], isAdmin: false, password: "0000", passwordChanged: false, canAddAssets: false, canEditAssets: false },
  { displayName: "Habila", loginName: "habila", states: ["Taraba"], isAdmin: false, password: "0000", passwordChanged: false, canAddAssets: false, canEditAssets: false },
  { displayName: "Peace", loginName: "peace", states: ["Sokoto"], isAdmin: false, password: "0000", passwordChanged: false, canAddAssets: false, canEditAssets: false },
  { displayName: "Lafarma", loginName: "lafarma", states: ["Kebbi"], isAdmin: false, password: "0000", passwordChanged: false, canAddAssets: false, canEditAssets: false },
  { displayName: "Kyautau", loginName: "kyautau", states: ["Kaduna"], isAdmin: false, password: "0000", passwordChanged: false, canAddAssets: false, canEditAssets: false },
  { displayName: "Chidozie", loginName: "chidozie", states: ["Niger"], isAdmin: false, password: "0000", passwordChanged: false, canAddAssets: false, canEditAssets: false },
  { displayName: "Ibeku", loginName: "ibeku", states: ["Edo"], isAdmin: false, password: "0000", passwordChanged: false, canAddAssets: false, canEditAssets: false },
  { displayName: "Rebecca", loginName: "rebecca", states: ["Ondo"], isAdmin: false, password: "0000", passwordChanged: false, canAddAssets: false, canEditAssets: false },
  { displayName: "Ude", loginName: "ude", states: ["Oyo"], isAdmin: false, password: "0000", passwordChanged: false, canAddAssets: false, canEditAssets: false },
  { displayName: "Janet", loginName: "janet", states: ["Plateau"], isAdmin: false, password: "0000", passwordChanged: false, canAddAssets: false, canEditAssets: false },
  { displayName: "Bala", loginName: "bala", states: ["Nasarawa"], isAdmin: false, password: "0000", passwordChanged: false, canAddAssets: false, canEditAssets: false },
];
