# NTBLCP Asset Registry - Structural Inventory Report

**Status:** Discovery Complete
**Methodology:** Deterministic Column A Traversal & Two-Stage Template Discovery

---

## SECTION 1: TB.xlsx

1. **Group: GENERAL**
   - **Header set:** [S/N, Location, Assignee (Location), Asset Description, Asset ID Code, Asset Class, Manufacturer, Model Number, Serial Number, Suppliers, Date Purchased or Received, ...]
   - **Header source:** explicit
   - **Asset count:** 375
   - **Start row:** 6
   - **End row:** 382
   - **Header row:** Row 7
   - **Notes:** Primary TB template pulse (42+ columns including depreciation).

2. **Group: IT EQUIPMENT**
   - **Header set:** [Matches GENERAL template]
   - **Header source:** inferred
   - **Asset count:** 6
   - **Start row:** 383
   - **End row:** 389
   - **Header row:** none
   - **Notes:** Structural block found below "GENERAL".

3. **Group: PRINTER MACHINE - 10 Pieces**
   - **Header set:** [Matches GENERAL template]
   - **Header source:** inferred
   - **Asset count:** 11
   - **Start row:** 390
   - **End row:** 401
   - **Header row:** none

4. **Group: PMU Office Cabinet - 21 pieces**
   - **Header set:** [Matches GENERAL template]
   - **Header source:** inferred
   - **Asset count:** 21
   - **Start row:** 402
   - **End row:** 423
   - **Header row:** none

5. **Group: PMU Office Equipment (OE)**
   - **Header set:** [Matches GENERAL template]
   - **Header source:** inferred
   - **Asset count:** 373
   - **Start row:** 424
   - **End row:** 797
   - **Header row:** none

6. **Group: 2023 ADDITIONAL ASSETS**
   - **Header set:** [Matches GENERAL template]
   - **Header source:** inferred
   - **Asset count:** 109
   - **Start row:** 798
   - **End row:** 907
   - **Header row:** none

7. **Group: 2024 ADDITIONAL ASSETS**
   - **Header set:** [Matches GENERAL template]
   - **Header source:** inferred
   - **Asset count:** 80
   - **Start row:** 908
   - **End row:** 988
   - **Header row:** none

8. **Group: gx-iv**
   - **Header set:** [Matches GENERAL template]
   - **Header source:** inferred
   - **Asset count:** 9
   - **Start row:** 989
   - **End row:** 998
   - **Header row:** none

9. **Group: 2025 ADDITIONAL ASSETS**
   - **Header set:** [S/N, Location, Assignee, Asset Description, Asset ID Code, Asset Class, Manufacturer, Model Number, Serial Number, Supplier, Date Purchased or Received, ...]
   - **Header source:** inferred
   - **Asset count:** 1
   - **Start row:** 999
   - **End row:** 1000
   - **Header row:** none
   - **Notes:** Detected transition to 20-column simplified template.

10. **Group: LSTBLCP_ TRANSFERRED ASSETS**
    - **Header set:** [S/N, ASSETS TAG NO, ASSET CLASS, QTY, DESCRIPTION, IMPLEMENTER, IMPLEMENTATION PERIOD, GRANT CYCLE, SERIAL NUMBER, ...]
    - **Header source:** explicit
    - **Asset count:** 82
    - **Start row:** 1001
    - **End row:** 1084
    - **Header row:** Row 1002
    - **Notes:** Transfer-specific positional pulse.

11. **Group: LSMOH - DFB_ TRANSFERRED ASSETS**
    - **Header set:** [S/N, ASSETS TAG NO, ASSET CLASS, QTY, DESCRIPTION, LOCATION, CUSTODIAN, SOURCE, SERIAL NUMBER, ACQUISITION DATE, ...]
    - **Header source:** explicit
    - **Asset count:** 71
    - **Start row:** 1085
    - **End row:** 1157
    - **Header row:** Row 1086

12. **Group: IHVN_ TRANSFERRED ASSETS**
    - **Header set:** [S/N, TAG NUMBERS, DESCRIPTION, CLASSIFICATION, QTY, LOCATION, SITE, STATE, YEAR OF PURCHASE, ASSET SERIAL NUMBERS, ...]
    - **Header source:** explicit
    - **Asset count:** 1589
    - **Start row:** 1158
    - **End row:** 2748
    - **Header row:** Row 1159

13. **Group: COMPUTERS**
    - **Header set:** [S/N, TAG NUMBER, DESCRIPTION, QTY, CATEGORY, YEAR OF PURCHASE, LOCATION/USER, SERIAL NUMBER, MODEL NUMBER, ...]
    - **Header source:** explicit
    - **Asset count:** 83
    - **Start row:** 2749
    - **End row:** 2833
    - **Header row:** Row 2750

14. **Group: IT-EQUIPMENTS**
    - **Header set:** [Matches COMPUTERS template]
    - **Header source:** explicit
    - **Asset count:** 20
    - **Start row:** 2834
    - **End row:** 2855
    - **Header row:** Row 2835

15. **Group: INHERITED ASSESTS**
    - **Header set:** [S/N, TAG NUMBERS, DESCRIPTION, CLASSIFICATION, QTY, LOCATION, SITE, STATE, YEAR OF PURCHASE, SERIAL NUMBERS, ...]
    - **Header source:** explicit
    - **Asset count:** 1042
    - **Start row:** 2856
    - **End row:** 3899
    - **Header row:** Row 2857

16. **Group: FHI360 - IHVN_ TRANSFERRED ASSETS (MOTOR VEHICLES)**
    - **Header set:** [S/N, Location, Assignee, Asset Description, Asset ID Code, Asset Class, Manufacturer, Engine no, Chasis no, Suppliers, ...]
    - **Header source:** explicit
    - **Asset count:** 36
    - **Start row:** 3900
    - **End row:** 3937
    - **Header row:** Row 3901

17. **Group: IHVN_ TRANSFERRED ASSETS (GENEXPERT MACHINES)**
    - **Header set:** [S/N, Location, Assignee, Asset Description, Asset ID Code, Asset Class, Manufacturer, Model Number, Serial Number, Supplier, ...]
    - **Header source:** explicit
    - **Asset count:** 717
    - **Start row:** 3938
    - **End row:** 4656
    - **Header row:** Row 3939

18. **Group: 2025 Additions**
    - **Header set:** [Matches 20-column additional-assets template]
    - **Header source:** inferred
    - **Asset count:** 20
    - **Start row:** 4657
    - **End row:** 4677
    - **Header row:** none

---

## SECTION 2: C19 ASSETS.xlsx

1. **Group: 2024 ADDITIONAL ASSETS (MOTORBIKES)**
   - **Header set:** [S/N, Location, LGA, Assignee, Asset Description, Asset ID Code, Asset Class, Manufacturer, Chasis no, Engine no, Suppliers, ...]
   - **Header source:** explicit
   - **Asset count:** 1548
   - **Start row:** 6
   - **End row:** 1555
   - **Header row:** Row 7

2. **Group: 2024 ADDITIONAL ASSETS (PDX)**
   - **Header set:** [S/N, Location, LGA, Assignee, Asset Description, Asset ID Code, Asset Class, Manufacturer, Model Number, Serial Number, Supplier, ...]
   - **Header source:** explicit
   - **Asset count:** 185
   - **Start row:** 1556
   - **End row:** 1742
   - **Header row:** Row 1557

3. **Group: 2024 ADDITIONAL ASSETS (TB LAMP)**
   - **Header set:** [Matches PDX template]
   - **Header source:** explicit
   - **Asset count:** 125
   - **Start row:** 1743
   - **End row:** 1869
   - **Header row:** Row 1744

4. **Group: TRUENAT**
   - **Header set:** [Matches PDX template]
   - **Header source:** explicit
   - **Asset count:** 333
   - **Start row:** 1870
   - **End row:** 2204
   - **Header row:** Row 1871

5. **Group: SAMSUNG GALAXY TABLETS**
   - **Header set:** [S/N, Location, LGA, Assignee, Asset Description, Asset ID Code, Asset Class, Manufacturer, Model No, Serial Number, Suppliers, ...]
   - **Header source:** explicit
   - **Asset count:** 12000
   - **Start row:** 2205
   - **End row:** 14206
   - **Header row:** Row 2206

6. **Group: 2025 ADDITIONS (PDX)**
   - **Header set:** [Matches PDX template]
   - **Header source:** explicit
   - **Asset count:** 205
   - **Start row:** 14207
   - **End row:** 14413
   - **Header row:** Row 14208

7. **Group: ECG Machine**
   - **Header set:** [Matches PDX template]
   - **Header source:** explicit
   - **Asset count:** 370
   - **Start row:** 14414
   - **End row:** 14785
   - **Header row:** Row 14415
