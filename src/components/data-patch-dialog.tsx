
"use client";

import React, { useState } from 'react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';
import { Button } from './ui/button';
import { useAppState } from '@/contexts/app-state-context';
import { useAuth } from '@/contexts/auth-context';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getLocalAssets, saveAssets } from '@/lib/idb';
import { sanitizeForFirestore } from '@/lib/excel-parser';

interface DataPatchDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

const assigneePatchData: { [key: number]: string } = {
    1: "PMU Finance Office", 2: "Finance", 3: "Admin", 4: "PMU Finance Office", 5: "Admin", 6: "Admin", 7: "PMU Finance Office", 8: "Admin/PMU finance office",
    9: "Finance", 10: "Admin Office", 11: "Finance", 12: "Steve IT", 13: "Conference Room", 14: "Conference Room", 15: "Store", 16: "Head Admin/Finance",
    17: "NC’s Office", 18: "Finance", 19: "Head Admin/Finance", 20: "ACSM", 21: "Finance", 22: "Head PPM/DOT/Leprosy,BU", 23: "PMDT", 24: "PMDT Open office space",
    25: "ACSM Open office space", 26: "Head of Finance/Admin", 27: "NC's Office", 28: "Finance", 29: "NC's Office", 30: "Mr Adeleke", 31: "Mr. Daodu Olumide",
    32: "NC's Office", 33: "Finance", 34: "Finance", 35: "Conference room", 36: "Conference Room", 37: "Conference Room", 38: "Conference Room",
    39: "Conference Room", 40: "NC office", 41: "Finance", 42: "Head of Finance", 43: "Mr. Stephen Raji", 44: "Admin", 45: "PMU Finance Office",
    46: "Finance", 47: "Finance", 48: "IT room", 49: "IT room", 50: "IT room", 51: "Niger STBLCP", 52: "Niger State Store", 53: "North Central Zonal Store",
    54: "North Central Zonal Store", 55: "North Central Zonal Store", 56: "North Central Zonal Store", 57: "Infusion Center", 58: "Benue store", 59: "Kogi STBLCP",
    60: "Kogi STBLCP", 61: "PSM GROUND FLOOR", 62: "PMU SFO office", 63: "FCT", 64: "North East Zonal Store", 65: "North East Zonal Store", 66: "Bauchi Store",
    67: "YOBE STBLCO", 68: "State store", 69: "BORNO STBLCO", 70: "North East Zonal Store", 71: "North East Zonal Store", 72: "North West Zonal Store",
    73: "North West Zonal Store", 74: "North West Zonal Store", 75: "North West Zonal Store", 76: "Kaduna State Store", 77: "AkwaIbom STBLCO", 78: "AkwaIbom STBLCO",
    79: "Bayelsa STBLCO", 80: "CrossRiver STBLCO", 81: "Delta STBLCO", 82: "State store", 83: "State store", 84: "State store", 85: "Abia STBLCO",
    86: "Enugu Store", 87: "Imo STBLCO", 88: "South East Zonal Store", 89: "Ondo STBLCO", 90: "South West Zonal Store", 91: "South West Zonal Store",
    92: "UCH", 93: "SACRED HEART HOSPITAL", 94: "EKITI STBLCO", 95: "FCMS", 96: "FCMS", 97: "FCMS", 98: "FCMS", 99: "FCMS", 100: "FCMS", 101: "FCMS",
    102: "FCMS", 103: "FCMS", 104: "FCMS", 105: "FCMS", 106: "FCMS", 107: "FCMS", 108: "FCMS", 109: "FCMS", 110: "FCMS", 111: "FCMS", 112: "FCMS",
    113: "FCMS", 114: "FCMS", 115: "FCMS", 116: "FCMS", 117: "FCMS", 118: "FCMS", 119: "FCMS", 120: "FCMS", 121: "FCMS", 122: "FCMS", 123: "FCMS",
    124: "North Central Zonal Store", 125: "North Central Zonal Store", 126: "North Central Zonal Store", 127: "North Central Zonal Store", 128: "North Central Zonal Store",
    129: "North Central Zonal Store", 130: "North Central Zonal Store", 131: "North Central Zonal Store", 132: "North Central Zonal Store", 133: "North Central Zonal Store",
    134: "North Central Zonal Store", 135: "North Central Zonal Store", 136: "North Central Zonal Store", 137: "North Central Zonal Store", 138: "North Central Zonal Store",
    139: "North Central Zonal Store", 140: "North Central Zonal Store", 141: "North Central Zonal Store", 142: "North Central Zonal Store", 143: "North Central Zonal Store",
    144: "North Central Zonal Store", 145: "North Central Zonal Store", 146: "North Central Zonal Store", 147: "North Central Zonal Store", 148: "North Central Zonal Store",
    149: "North Central Zonal Store", 150: "North Central Zonal Store", 151: "North Central Zonal Store", 152: "North Central Zonal Store", 153: "North Central Zonal Store",
    154: "North Central Zonal Store", 155: "North Central Zonal Store", 156: "North Central Zonal Store", 157: "North Central Zonal Store", 158: "Kogi STBLCP",
    159: "Kogi STBLCP", 160: "Kogi STBLCP", 161: "Kogi STBLCP", 162: "Kogi STBLCP", 163: "North Central Zonal Store", 164: "North Central Zonal Store",
    165: "North Central Zonal Store", 166: "North Central Zonal Store", 167: "North Central Zonal Store", 168: "North Central Zonal Store", 169: "North Central Zonal Store",
    170: "North Central Zonal Store", 171: "North Central Zonal Store", 172: "North Central Zonal Store", 173: "State store", 174: "State store", 175: "State store",
    176: "State store", 177: "State store", 178: "State store", 179: "State store", 180: "State store", 181: "State store", 182: "State store",
    183: "State store", 184: "State store", 185: "State store", 186: "State store", 187: "State store", 188: "State store", 189: "State store",
    190: "State store", 191: "State store", 192: "State store", 193: "State store", 194: "State store", 195: "State store", 196: "State store",
    197: "State store", 198: "State store", 199: "State store", 200: "State store", 201: "State store", 202: "State store", 203: "State store",
    204: "State store", 205: "State store", 206: "State store", 207: "State store", 208: "State store", 209: "State store", 210: "State store",
    211: "State store", 212: "State store", 213: "State store", 214: "State store", 215: "State store", 216: "State store", 217: "North East Zonal Store",
    218: "North East Zonal Store", 219: "North East Zonal Store", 220: "North East Zonal Store", 221: "North East Zonal Store", 222: "North East Zonal Store",
    223: "North East Zonal Store", 224: "North East Zonal Store", 225: "North East Zonal Store", 226: "North East Zonal Store", 227: "North West Zonal Store",
    228: "North West Zonal Store", 229: "North West Zonal Store", 230: "North West Zonal Store", 231: "North West Zonal Store", 232: "North West Zonal Store",
    233: "North West Zonal Store", 234: "North West Zonal Store", 235: "North West Zonal Store", 236: "North West Zonal Store", 237: "North West Zonal Store",
    238: "North West Zonal Store", 239: "North West Zonal Store", 240: "North West Zonal Store", 241: "North West Zonal Store", 242: "North West Zonal Store",
    243: "North West Zonal Store", 244: "North West Zonal Store", 245: "North West Zonal Store", 246: "North West Zonal Store", 247: "North West Zonal Store",
    248: "North West Zonal Store", 249: "North West Zonal Store", 250: "North West Zonal Store", 251: "North West Zonal Store", 252: "North West Zonal Store",
    253: "North West Zonal Store", 254: "North West Zonal Store", 255: "North West Zonal Store", 256: "North West Zonal Store", 257: "North West Zonal Store",
    258: "North West Zonal Store", 259: "North West Zonal Store", 260: "North West Zonal Store", 261: "North West Zonal Store", 262: "North West Zonal Store",
    263: "North West Zonal Store", 264: "North West Zonal Store", 265: "North West Zonal Store", 266: "Store", 267: "Store", 268: "Store", 269: "Store",
    270: "Store", 271: "Store", 272: "Store", 273: "Store", 274: "Store", 275: "Store", 276: "Store", 277: "Store", 278: "Store", 279: "Store",
    280: "Store", 281: "Store", 282: "Store", 283: "Store", 284: "Store", 285: "Store", 286: "Store", 287: "Store", 288: "Store", 289: "Store",
    290: "Store", 291: "Store", 292: "Store", 293: "Store", 294: "Store", 295: "South South Zonal Store", 296: "South South Zonal Store",
    297: "South South Zonal Store", 298: "South South Zonal Store", 299: "South South Zonal Store", 300: "South South Zonal Store", 301: "South South Zonal Store",
    302: "South South Zonal Store", 303: "South South Zonal Store", 304: "South South Zonal Store", 305: "South South Zonal Store", 306: "Store", 307: "Store",
    308: "Store", 309: "Store", 310: "Store", 311: "Store", 312: "Store", 313: "Store", 314: "Store", 315: "Store", 316: "Store", 317: "Store",
    318: "Store", 319: "Store", 320: "South South Zonal Store", 321: "South South Zonal Store", 322: "South South Zonal Store", 323: "South South Zonal Store",
    324: "South South Zonal Store", 325: "South South Zonal Store", 326: "South South Zonal Store", 327: "South South Zonal Store", 328: "South South Zonal Store",
    329: "South South Zonal Store", 330: "South South Zonal Store", 331: "Store", 332: "Store", 333: "Store", 334: "Store", 335: "Store", 336: "Store",
    337: "Store", 338: "Store", 339: "Store", 340: "South West Zonal Store", 341: "South West Zonal Store", 342: "South West Zonal Store", 343: "South West Zonal Store",
    344: "South West Zonal Store", 345: "South West Zonal Store", 346: "South West Zonal Store", 347: "South West Zonal Store", 348: "South West Zonal Store",
    349: "South West Zonal Store", 350: "South West Zonal Store", 351: "South West Zonal Store", 352: "South West Zonal Store", 353: "South West Zonal Store",
    354: "South West Zonal Store", 355: "South West Zonal Store", 356: "South West Zonal Store", 357: "South West Zonal Store", 358: "South West Zonal Store",
    359: "South West Zonal Store", 360: "South West Zonal Store", 361: "South West Zonal Store", 362: "South West Zonal Store", 363: "South West Zonal Store",
    364: "South West Zonal Store", 365: "South West Zonal Store", 366: "South West Zonal Store", 367: "South West Zonal Store", 368: "South West Zonal Store",
    369: "South West Zonal Store", 370: "South West Zonal Store", 371: "South West Zonal Store", 372: "South West Zonal Store", 373: "South West Zonal Store",
    374: "South West Zonal Store", 375: "Steve Raji", 376: "Steve Raji", 377: "Steve Raji", 378: "Steve Raji", 379: "Chidera Ogoh", 380: "Dr Emperor",
    381: "Steve Raji", 382: "Raji Mobolaji", 383: "GFA", 384: "Finance", 385: "Babatunde Adeleke", 386: "Dr Emperor", 387: "Audit office",
    388: "Olawumi Olarewaju", 389: "Finance", 390: "Dr Chukwuma Anyaike", 391: "Mr Linus Dapiyah", 392: "PSM", 393: "PSM", 394: "FINANCE", 395: "FINANCE",
    396: "FINANCE", 397: "FINANCE", 398: "M&E", 399: "M&E", 400: "M&E", 401: "FINANCE", 402: "PMU programs", 403: "PSM", 404: "MUMMY TUBI", 405: "HR",
    406: "HR", 407: "FINANCE", 408: "AUDIT", 409: "AUDIT", 410: "DR EMPEROR", 411: "FA", 412: "FA", 413: "F&A Mgr", 414: "PSM", 415: "Finance Unit",
    416: "GFA", 417: "HR", 418: "Situation Room", 419: "Conference room", 420: "NC's Office (sect)", 421: "NC's Office", 422: "Dr Emperor",
    423: "Dr Emperor", 424: "PMU KITCHEN", 425: "FINANCE", 426: "Dr Emperor", 427: "PMU KITCHEN", 428: "PMU KITCHEN", 429: "Finance office",
    430: "Finance office", 431: "FINANCE", 432: "FINANCE", 433: "PSM", 434: "M&E", 435: "FA", 436: "FINANCE", 437: "FUNMI", 438: "DR EMPEROR",
    439: "WEASLEY", 440: "DR EMPEROR", 441: "Conference room", 442: "MARY", 443: "Broken", 444: "LINDA FA", 445: "DR EMPEROR", 446: "TOSIN",
    447: "Team Lead", 448: "DR OMBEKA", 449: "ANN", 450: "Broken", 451: "TUMISHE FA", 452: "DR EMPEROR", 453: "Mrs Elizabeth", 454: "Samuel Rabo",
    455: "Dr Emperor", 456: "DR OBIOMA", 457: "GFA Ofice", 458: "GFA Ofice", 459: "ADELEKE", 460: "Programs Office", 461: "GFA Ofice",
    462: "PHARM RAJI", 463: "OFURE", 464: "MUMMY TUBI", 465: "Audit Office", 466: "DR OMBEKA", 467: "SFO ffice", 468: "Dr Emperor",
    469: "Programs Office", 470: "Pharm Raji", 471: "MUMMY TUBI", 472: "Mr Adeleke", 473: "Dr Obioma", 474: "GFA Ofice", 475: "Finance office",
    476: "Mr Israel Adio", 477: "Audit Office", 478: "SFO ffice", 479: "Benue M&E", 480: "Rivers M&E", 481: "Cross River M&E", 482: "Enugu M&E",
    483: "Lagos M&E", 484: "Abia M&E", 485: "Kano M&E", 486: "Adamawa M&E", 487: "Imo M&E", 488: "Ogun M&E", 489: "Delta M&E Officer",
    490: "Kwara M & E", 491: "Ebonyi M&E", 492: "Anambra M&E", 493: "Kogi M&E", 494: "Yobe M&E", 495: "Oyo M& E Officer", 496: "Bayelsa M&E",
    497: "Sokoto M&E", 498: "Ekiti M&E", 499: "Kebbi M&E", 500: "Bauchi M&E", 501: "Osun M&E", 502: "Jigawa M&E", 503: "Kaduna M&E",
    504: "Nasarawa M&E", 505: "Zamfara M&E", 506: "Katsina M&E", 507: "Akwa Ibom M&E", 508: "Borno M&E", 509: "Ondo", 510: "Plateau M&E",
    511: "Gombe M&E", 512: "Edo M&E", 513: "Taraba M&E", 514: "Niger M&E", 515: "Wumi", 516: "Admin Office", 517: "Audit Office", 518: "IT Officer",
    519: "IT Office", 520: "IT Office", 521: "IT Office", 522: "Ofure Ugbesia", 523: "Dr Emperor Ubochioma", 524: "Team Lead", 525: "Situation Room",
    526: "PMU Programs", 527: "Finance PMU", 528: "HR/Admin Office", 529: "Chidera Ogoh", 530: "PSM", 531: "Linus Dapiyah", 532: "PSM office",
    533: "NTBLCP", 534: "Finance PMU", 535: "Finance PMU", 536: "Finance PMU", 537: "GFA Ofice", 538: "Team Lead", 539: "Conference room",
    540: "ACSM", 541: "ACSM", 542: "PMU Finance Office", 543: "GFA Ofice", 544: "Lab Unit", 545: "PSM Unit", 546: "PMU Programs",
    547: "PMU Admin/HR", 548: "IT Equipment Room", 549: "M&E PMU", 550: "Programs", 551: "Audit Office", 552: "Admin Office", 553: "Logistics",
    554: "PPM", 555: "M&E", 556: "Pharm Alhassan", 557: "NTBLCP IT & Communication OFficer", 558: "NTBLCP IT & Communication OFficer", 559: "Rebecca Owolabi",
    560: "IT Store", 561: "IT Store", 562: "Admin", 563: "Admin", 564: "Finance Unit", 565: "Finance Unit", 566: "Finance Unit", 567: "IT officer",
    568: "Lab Manager - Mrs. Abiola Tubi", 569: "Weasley", 570: "IT officer", 571: "IT/Communications Officer - Mr. Stephen Raji", 572: "IT Store",
    573: "Daodu Olumide", 574: "Israel Adio", 575: "Samuel Rabo", 576: "Pharm. Raji Mobolaji", 577: "Program Manager", 578: "Program Manager",
    579: "Program Manager", 580: "Program Manager", 581: "Program Manager", 582: "Program Manager", 583: "Program Manager", 584: "Program Manager",
    585: "Program Manager", 586: "Program Manager", 587: "Program Manager", 588: "Program Manager", 589: "Program Manager", 590: "Program Manager",
    591: "Program Manager", 592: "Program Manager", 593: "Program Manager", 594: "Program Manager", 595: "Program Manager", 596: "Program Manager",
    597: "Program Manager", 598: "Program Manager", 599: "Program Manager", 600: "Program Manager", 601: "Program Manager", 602: "Program Manager",
    603: "Program Manager", 604: "Program Manager", 605: "Program Manager", 606: "Program Manager", 607: "Program Manager", 608: "Program Manager",
    609: "Program Manager", 610: "Program Manager", 611: "Program Manager", 612: "Linus Dapiyah", 613: "Dr Obioma Akaniro", 614: "Mrs Funmilayo Omosebi",
    615: "Miss Wumi Olarewaju", 616: "Dr Folasade Idowu ( SW Zone)", 617: "Dr George Ikpe (SE Zone)", 618: "Pharm AlhassanShuaibu", 619: "IT Store",
    620: "Wesley Bala", 621: "IT Store", 622: "Gambo Ajegena", 623: "Ofure Ugbesia", 624: "MTN Data Centre", 625: "MTN Data Centre", 626: "Mary Etolue",
    627: "Bauchi State M& E Officer", 628: "Abia State M& E Officer", 629: "Akwa Ibom State M& E Officer", 630: "Kwara M& E Officer", 631: "Borno State M& E Officer",
    632: "Plateau State M& E Officer", 633: "Delta State M& E Officer", 634: "Yobe State M& E Officer", 635: "FCT State M& E Officer", 636: "Gombe State M& E Officer",
    637: "Oyo State M& E Officer", 638: "Ondo State M& E Officer", 639: "Katsina State M& E Officer", 640: "Rivers State M& E Officer", 641: "PM", 642: "PM",
    643: "PM", 644: "PM", 645: "PM", 646: "PM", 647: "PM", 648: "PM", 649: "PM", 650: "PM", 651: "PM", 652: "PM", 653: "PM", 654: "PM", 655: "NTBLCP",
    656: "PM", 657: "Program Manager", 658: "PM", 659: "PM", 660: "PM", 661: "PM", 662: "PM", 663: "PM", 664: "PM", 665: "NTBLCP", 666: "PM",
    667: "PM", 668: "PM", 669: "NTBLCP", 670: "NTBLCP"
};

export function DataPatchDialog({ isOpen, onOpenChange }: DataPatchDialogProps) {
  const { setAssets, userProfile } = useAppState();
  const [isPatching, setIsPatching] = useState(false);
  const { toast } = useToast();

  const handleApplyPatch = async () => {
    setIsPatching(true);
    try {
      const allAssets = await getLocalAssets();
      let updatedCount = 0;
      const patchedAssets = allAssets.map(asset => {
        if (asset.sn && assigneePatchData[Number(asset.sn)]) {
            const newAssignee = assigneePatchData[Number(asset.sn)];
            if (asset.assignee !== newAssignee) {
                updatedCount++;
                return sanitizeForFirestore({
                    ...asset,
                    assignee: newAssignee,
                    lastModified: new Date().toISOString(),
                    lastModifiedBy: userProfile?.displayName,
                    lastModifiedByState: userProfile?.state,
                    syncStatus: 'local',
                });
            }
        }
        return asset;
      });

      await saveAssets(patchedAssets);
      setAssets(patchedAssets);
      
      toast({
        title: 'Patch Applied',
        description: `${updatedCount} asset(s) were updated with new assignees. Your changes have been saved locally and will be synced.`,
      });
      onOpenChange(false);
    } catch (error) {
      console.error("Data patch failed:", error);
      toast({
        title: 'Patch Failed',
        description: 'An error occurred while updating asset data.',
        variant: 'destructive',
      });
    } finally {
      setIsPatching(false);
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Apply Assignee Data Patch?</AlertDialogTitle>
          <AlertDialogDescription>
            This action will update the "Assignee" field for up to 670 assets based on a predefined list mapped by S/N. This is a one-time operation. Are you sure you want to continue?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleApplyPatch} disabled={isPatching}>
            {isPatching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Apply Patch
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
