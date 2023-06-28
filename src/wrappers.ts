export type Wrapper<T extends Features | null = null> = (
  features: string[]
) => T | null;

export type Features = { [key: string]: string };

export const createUnidicFeature26: Wrapper<UnidicFeature26> = (
  features: string[]
): UnidicFeature26 | null =>
  features.length !== 26
    ? null
    : {
        pos1: features[0],
        pos2: features[1],
        pos3: features[2],
        pos4: features[3],
        cType: features[4],
        cForm: features[5],
        lForm: features[6],
        lemma: features[7],
        orth: features[8],
        pron: features[9],
        orthBase: features[10],
        pronBase: features[11],
        goshu: features[12],
        iType: features[13],
        iForm: features[14],
        fType: features[15],
        fForm: features[16],
        kana: features[17],
        kanaBase: features[18],
        form: features[19],
        formBase: features[20],
        iConType: features[21],
        fConType: features[22],
        aType: features[23],
        aConType: features[24],
        aModType: features[25],
      };

export interface UnidicFeature26 extends Features {
  pos1: string;
  pos2: string;
  pos3: string;
  pos4: string;
  cType: string;
  cForm: string;
  lForm: string;
  lemma: string;
  orth: string;
  pron: string;
  orthBase: string;
  pronBase: string;
  goshu: string;
  iType: string;
  iForm: string;
  fType: string;
  fForm: string;
  kana: string;
  kanaBase: string;
  form: string;
  formBase: string;
  iConType: string;
  fConType: string;
  aType: string;
  aConType: string;
  aModType: string;
}

export const createUnidicFeature29: Wrapper<UnidicFeature29> = (
  features: string[]
): UnidicFeature29 | null =>
  features.length !== 29
    ? null
    : {
        pos1: features[0],
        pos2: features[1],
        pos3: features[2],
        pos4: features[3],
        cType: features[4],
        cForm: features[5],
        lForm: features[6],
        lemma: features[7],
        orth: features[8],
        pron: features[9],
        orthBase: features[10],
        pronBase: features[11],
        goshu: features[12],
        iType: features[13],
        iForm: features[14],
        fType: features[15],
        fForm: features[16],
        iConType: features[17],
        fConType: features[18],
        type: features[19],
        kana: features[20],
        kanaBase: features[21],
        form: features[22],
        formBase: features[23],
        aType: features[24],
        aConType: features[25],
        aModType: features[26],
        lid: features[27],
        lemmaId: features[28],
      };

export interface UnidicFeature29 extends Features {
  pos1: string;
  pos2: string;
  pos3: string;
  pos4: string;
  cType: string;
  cForm: string;
  lForm: string;
  lemma: string;
  orth: string;
  pron: string;
  orthBase: string;
  pronBase: string;
  goshu: string;
  iType: string;
  iForm: string;
  fType: string;
  fForm: string;
  iConType: string;
  fConType: string;
  type: string;
  kana: string;
  kanaBase: string;
  form: string;
  formBase: string;
  aType: string;
  aConType: string;
  aModType: string;
  lid: string;
  lemmaId: string;
}
