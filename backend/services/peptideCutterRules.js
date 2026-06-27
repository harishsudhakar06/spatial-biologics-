/**
 * PeptideCutter Cleavage Rules Definitions
 * Based on Expasy PeptideCutter rules and Keil (1992)
 */

const ENZYMES = [
  {
    key: "ArgC",
    name: "Arg-C proteinase",
    type: "enzyme",
    description: "Cleaves at Arg (R) in position P1.",
    cleave: (p4, p3, p2, p1, p1_prime, p2_prime) => p1 === "R"
  },
  {
    key: "AspN",
    name: "Asp-N endopeptidase",
    type: "enzyme",
    description: "Cleaves bonds N-terminal to Asp (D) in position P1'.",
    cleave: (p4, p3, p2, p1, p1_prime, p2_prime) => p1_prime === "D"
  },
  {
    key: "AspGluN",
    name: "Asp-N endopeptidase + N-terminal Glu",
    type: "enzyme",
    description: "Cleaves bonds N-terminal to Asp (D) or Glu (E) in position P1'.",
    cleave: (p4, p3, p2, p1, p1_prime, p2_prime) => p1_prime === "D" || p1_prime === "E"
  },
  {
    key: "BNPS",
    name: "BNPS-Skatole",
    type: "chemical",
    description: "Chemical cleavage C-terminal to Trp (W) in position P1.",
    cleave: (p4, p3, p2, p1, p1_prime, p2_prime) => p1 === "W"
  },
  {
    key: "Casp1",
    name: "Caspase 1",
    type: "enzyme",
    description: "Cleaves after Asp (D) in P1 with P4=(F,W,Y,L), P2=(H,A,T), and P1' not in (P,E,D,Q,K,R).",
    cleave: (p4, p3, p2, p1, p1_prime, p2_prime) => 
      p1 === "D" && 
      ["F", "W", "Y", "L"].includes(p4) && 
      ["H", "A", "T"].includes(p2) && 
      !["P", "E", "D", "Q", "K", "R"].includes(p1_prime)
  },
  {
    key: "Casp2",
    name: "Caspase 2",
    type: "enzyme",
    description: "Cleaves after DVAD|X (P4=D, P3=V, P2=A, P1=D), where X is not in (P,E,D,Q,K,R).",
    cleave: (p4, p3, p2, p1, p1_prime, p2_prime) => 
      p1 === "D" && p2 === "A" && p3 === "V" && p4 === "D" && 
      !["P", "E", "D", "Q", "K", "R"].includes(p1_prime)
  },
  {
    key: "Casp3",
    name: "Caspase 3",
    type: "enzyme",
    description: "Cleaves after DMQD|X (P4=D, P3=M, P2=Q, P1=D), where X is not in (P,E,D,Q,K,R).",
    cleave: (p4, p3, p2, p1, p1_prime, p2_prime) => 
      p1 === "D" && p2 === "Q" && p3 === "M" && p4 === "D" && 
      !["P", "E", "D", "Q", "K", "R"].includes(p1_prime)
  },
  {
    key: "Casp4",
    name: "Caspase 4",
    type: "enzyme",
    description: "Cleaves after LEVD|X (P4=L, P3=E, P2=V, P1=D), where X is not in (P,E,D,Q,K,R).",
    cleave: (p4, p3, p2, p1, p1_prime, p2_prime) => 
      p1 === "D" && p2 === "V" && p3 === "E" && p4 === "L" && 
      !["P", "E", "D", "Q", "K", "R"].includes(p1_prime)
  },
  {
    key: "Casp5",
    name: "Caspase 5",
    type: "enzyme",
    description: "Cleaves after (W/L)EHD|X (P4=L or W, P3=E, P2=H, P1=D).",
    cleave: (p4, p3, p2, p1, p1_prime, p2_prime) => 
      p1 === "D" && p2 === "H" && p3 === "E" && ["L", "W"].includes(p4)
  },
  {
    key: "Casp6",
    name: "Caspase 6",
    type: "enzyme",
    description: "Cleaves after VE(H/I)D|X (P4=V, P3=E, P2=H or I, P1=D), where X is not in (P,E,D,Q,K,R).",
    cleave: (p4, p3, p2, p1, p1_prime, p2_prime) => 
      p1 === "D" && ["H", "I"].includes(p2) && p3 === "E" && p4 === "V" && 
      !["P", "E", "D", "Q", "K", "R"].includes(p1_prime)
  },
  {
    key: "Casp7",
    name: "Caspase 7",
    type: "enzyme",
    description: "Cleaves after DEVD|X (P4=D, P3=E, P2=V, P1=D), where X is not in (P,E,D,Q,K,R).",
    cleave: (p4, p3, p2, p1, p1_prime, p2_prime) => 
      p1 === "D" && p2 === "V" && p3 === "E" && p4 === "D" && 
      !["P", "E", "D", "Q", "K", "R"].includes(p1_prime)
  },
  {
    key: "Casp8",
    name: "Caspase 8",
    type: "enzyme",
    description: "Cleaves after (I/L)ETD|X (P4=I or L, P3=E, P2=T, P1=D), where X is not in (P,E,D,Q,K,R).",
    cleave: (p4, p3, p2, p1, p1_prime, p2_prime) => 
      p1 === "D" && p2 === "T" && p3 === "E" && ["I", "L"].includes(p4) && 
      !["P", "E", "D", "Q", "K", "R"].includes(p1_prime)
  },
  {
    key: "Casp9",
    name: "Caspase 9",
    type: "enzyme",
    description: "Cleaves after LEHD|X (P4=L, P3=E, P2=H, P1=D).",
    cleave: (p4, p3, p2, p1, p1_prime, p2_prime) => 
      p1 === "D" && p2 === "H" && p3 === "E" && p4 === "L"
  },
  {
    key: "Casp10",
    name: "Caspase 10",
    type: "enzyme",
    description: "Cleaves after IEAD|X (P4=I, P3=E, P2=A, P1=D).",
    cleave: (p4, p3, p2, p1, p1_prime, p2_prime) => 
      p1 === "D" && p2 === "A" && p3 === "E" && p4 === "I"
  },
  {
    key: "Ch_hi",
    name: "Chymotrypsin-high specificity",
    type: "enzyme",
    description: "Cleaves C-terminal to F or Y (if P1' is not P), or to W (if P1' is not M or P).",
    cleave: (p4, p3, p2, p1, p1_prime, p2_prime) => {
      if (p1 === "F" || p1 === "Y") return p1_prime !== "P";
      if (p1 === "W") return p1_prime !== "M" && p1_prime !== "P";
      return false;
    }
  },
  {
    key: "Ch_lo",
    name: "Chymotrypsin-low specificity",
    type: "enzyme",
    description: "Cleaves C-terminal to F, Y, L (if P1' is not P), W (if P1' is not M/P), M (if P1' is not P/Y), or H (if P1' is not D/M/P/W).",
    cleave: (p4, p3, p2, p1, p1_prime, p2_prime) => {
      if (p1 === "F" || p1 === "L" || p1 === "Y") return p1_prime !== "P";
      if (p1 === "W") return p1_prime !== "M" && p1_prime !== "P";
      if (p1 === "M") return p1_prime !== "P" && p1_prime !== "Y";
      if (p1 === "H") return !["D", "M", "P", "W"].includes(p1_prime);
      return false;
    }
  },
  {
    key: "Clost",
    name: "Clostripain (Clostridiopeptidase B)",
    type: "enzyme",
    description: "Cleaves C-terminal to Arg (R) in position P1.",
    cleave: (p4, p3, p2, p1, p1_prime, p2_prime) => p1 === "R"
  },
  {
    key: "CNBr",
    name: "CNBr",
    type: "chemical",
    description: "Cleaves C-terminal to Met (M) in position P1.",
    cleave: (p4, p3, p2, p1, p1_prime, p2_prime) => p1 === "M"
  },
  {
    key: "Enter",
    name: "Enterokinase",
    type: "enzyme",
    description: "Cleaves after Lys (K) in P1 with P4, P3, P2 as Asp (D) or Glu (E).",
    cleave: (p4, p3, p2, p1, p1_prime, p2_prime) => 
      p1 === "K" && 
      ["D", "E"].includes(p2) && 
      ["D", "E"].includes(p3) && 
      ["D", "E"].includes(p4)
  },
  {
    key: "Xa",
    name: "Factor Xa",
    type: "enzyme",
    description: "Cleaves after Arg (R) in P1, Gly (G) in P2, Asp/Glu in P3, and hydrophobic (A,F,G,I,L,T,V,M) in P4.",
    cleave: (p4, p3, p2, p1, p1_prime, p2_prime) => 
      p1 === "R" && 
      p2 === "G" && 
      ["D", "E"].includes(p3) && 
      ["A", "F", "G", "I", "L", "T", "V", "M"].includes(p4)
  },
  {
    key: "HCOOH",
    name: "Formic acid",
    type: "chemical",
    description: "Cleaves C-terminal to Asp (D) in position P1.",
    cleave: (p4, p3, p2, p1, p1_prime, p2_prime) => p1 === "D"
  },
  {
    key: "Glu",
    name: "Glutamyl endopeptidase",
    type: "enzyme",
    description: "Cleaves C-terminal to Glu (E) in position P1.",
    cleave: (p4, p3, p2, p1, p1_prime, p2_prime) => p1 === "E"
  },
  {
    key: "GranB",
    name: "GranzymeB",
    type: "enzyme",
    description: "Cleaves after IEPD (P4=I, P3=E, P2=P, P1=D).",
    cleave: (p4, p3, p2, p1, p1_prime, p2_prime) => 
      p1 === "D" && p2 === "P" && p3 === "E" && p4 === "I"
  },
  {
    key: "Hydro",
    name: "Hydroxylamine",
    type: "chemical",
    description: "Cleaves after Asn (N) in P1 when followed by Gly (G) in P1'.",
    cleave: (p4, p3, p2, p1, p1_prime, p2_prime) => p1 === "N" && p1_prime === "G"
  },
  {
    key: "Iodo",
    name: "Iodosobenzoic acid",
    type: "chemical",
    description: "Cleaves C-terminal to Trp (W) in position P1.",
    cleave: (p4, p3, p2, p1, p1_prime, p2_prime) => p1 === "W"
  },
  {
    key: "LysC",
    name: "LysC",
    type: "enzyme",
    description: "Cleaves C-terminal to Lys (K) in position P1.",
    cleave: (p4, p3, p2, p1, p1_prime, p2_prime) => p1 === "K"
  },
  {
    key: "LysN",
    name: "LysN",
    type: "enzyme",
    description: "Cleaves N-terminal to Lys (K) in position P1'.",
    cleave: (p4, p3, p2, p1, p1_prime, p2_prime) => p1_prime === "K"
  },
  {
    key: "Elast",
    name: "Neutrophil elastase",
    type: "enzyme",
    description: "Cleaves C-terminal to Ala (A) or Val (V) in position P1.",
    cleave: (p4, p3, p2, p1, p1_prime, p2_prime) => p1 === "A" || p1 === "V"
  },
  {
    key: "NTCB",
    name: "NTCB (2-nitro-5-thiocyanobenzoic acid)",
    type: "chemical",
    description: "Cleaves N-terminal to Cys (C) in position P1'.",
    cleave: (p4, p3, p2, p1, p1_prime, p2_prime) => p1_prime === "C"
  },
  {
    key: "Pn1.3",
    name: "Pepsin (pH 1.3)",
    type: "enzyme",
    description: "Cleaves before or after Phe (F) or Leu (L) if P3 is not basic (H,K,R), P2 is not Pro, and P2' / P1' is not Pro.",
    cleave: (p4, p3, p2, p1, p1_prime, p2_prime) => {
      const p3Ok = !["H", "K", "R"].includes(p3);
      const p2Ok = p2 !== "P";
      const p2PrimeOk = p2_prime !== "P";
      if (!p3Ok || !p2Ok || !p2PrimeOk) return false;

      // Cleave before F or L (P1' is F/L, and P1 is not R)
      const cleaveBefore = ["F", "L"].includes(p1_prime) && p1 !== "R";
      // Cleave after F or L (P1 is F/L, and P1' is not P)
      const cleaveAfter = ["F", "L"].includes(p1) && p1_prime !== "P";
      
      return cleaveBefore || cleaveAfter;
    }
  },
  {
    key: "Pn2",
    name: "Pepsin (pH > 2)",
    type: "enzyme",
    description: "Cleaves before or after Phe, Tyr, Trp, Leu (F,Y,W,L) if P3 is not basic (H,K,R), P2 is not Pro, and P2' / P1' is not Pro.",
    cleave: (p4, p3, p2, p1, p1_prime, p2_prime) => {
      const p3Ok = !["H", "K", "R"].includes(p3);
      const p2Ok = p2 !== "P";
      const p2PrimeOk = p2_prime !== "P";
      if (!p3Ok || !p2Ok || !p2PrimeOk) return false;

      const residues = ["F", "L", "W", "Y"];
      // Cleave before
      const cleaveBefore = residues.includes(p1_prime) && p1 !== "R";
      // Cleave after
      const cleaveAfter = residues.includes(p1) && p1_prime !== "P";
      
      return cleaveBefore || cleaveAfter;
    }
  },
  {
    key: "Pro",
    name: "Proline-endopeptidase",
    type: "enzyme",
    description: "Cleaves after Pro (P) in P1, when P2 is basic (H,K,R) and P1' is not Pro.",
    cleave: (p4, p3, p2, p1, p1_prime, p2_prime) => 
      p1 === "P" && ["H", "K", "R"].includes(p2) && p1_prime !== "P"
  },
  {
    key: "ProtK",
    name: "Proteinase K",
    type: "enzyme",
    description: "Cleaves C-terminal to aliphatic or aromatic (A,E,F,I,L,T,V,W,Y) in P1.",
    cleave: (p4, p3, p2, p1, p1_prime, p2_prime) => 
      ["A", "E", "F", "I", "L", "T", "V", "W", "Y"].includes(p1)
  },
  {
    key: "Staph",
    name: "Staphylococcal peptidase I",
    type: "enzyme",
    description: "Cleaves C-terminal to Glu (E) in P1 if P2 is not Glu (E).",
    cleave: (p4, p3, p2, p1, p1_prime, p2_prime) => p1 === "E" && p2 !== "E"
  },
  {
    key: "TEV",
    name: "Tobacco etch virus protease",
    type: "enzyme",
    description: "Cleaves after Q in ENLYFQ|G/S (modeled as XYXQ|[GS], P3=Y, P1=Q, P1'=G/S).",
    cleave: (p4, p3, p2, p1, p1_prime, p2_prime) => 
      p1 === "Q" && p3 === "Y" && ["G", "S"].includes(p1_prime)
  },
  {
    key: "Therm",
    name: "Thermolysin",
    type: "enzyme",
    description: "Cleaves N-terminal to bulky/aromatic (A,F,I,L,M,V) in P1' if P1 is not Asp (D) or Glu (E).",
    cleave: (p4, p3, p2, p1, p1_prime, p2_prime) => 
      ["A", "F", "I", "L", "M", "V"].includes(p1_prime) && !["D", "E"].includes(p1)
  },
  {
    key: "Throm",
    name: "Thrombin",
    type: "enzyme",
    description: "Cleaves after Arg (R) in P1. Standard: P2=G, P1'=G. Sophisticated: P4=(A,F,G,I,L,T,V,M), P3=(A,F,G,I,L,T,V,W), P2=P, P1' & P2' not (D,E).",
    cleave: (p4, p3, p2, p1, p1_prime, p2_prime) => {
      if (p1 !== "R") return false;
      // Option A
      if (p2 === "G" && p1_prime === "G") return true;
      // Option B
      return (
        p2 === "P" &&
        ["A", "F", "G", "I", "L", "T", "V", "M"].includes(p4) &&
        ["A", "F", "G", "I", "L", "T", "V", "W"].includes(p3) &&
        !["D", "E"].includes(p1_prime) &&
        !["D", "E"].includes(p2_prime)
      );
    }
  },
  {
    key: "Tryps",
    name: "Trypsin",
    type: "enzyme",
    description: "Cleaves C-terminal to Arg (R) or Lys (K). Pro (P) in P1' blocks cleavage unless rescued by W in P2 (for K) or M in P2 (for R). Exceptions apply.",
    cleave: (p4, p3, p2, p1, p1_prime, p2_prime) => {
      if (!["K", "R"].includes(p1)) return false;

      // 1. Check Exceptions (No Cleavage)
      if (p1 === "K" && p1_prime === "D" && ["C", "D"].includes(p2)) return false;
      if (p1 === "K" && ["H", "Y"].includes(p1_prime) && p2 === "C") return false;
      if (p1 === "R" && p1_prime === "K" && p2 === "C") return false;
      if (p1 === "R" && ["H", "R"].includes(p1_prime) && p2 === "R") return false;

      // 2. Proline blocking & rescue rules
      if (p1_prime === "P") {
        if (p1 === "K" && p2 === "W") return true;
        if (p1 === "R" && p2 === "M") return true;
        return false;
      }

      return true;
    }
  }
];

/**
 * Probability Models for Trypsin and Chymotrypsin
 * Derived from Keil (1992) statistical matrices
 */
function calculateProbability(enzymeKey, p4, p3, p2, p1, p1_prime, p2_prime) {
  if (enzymeKey === "Tryps") {
    if (!["K", "R"].includes(p1)) return 0;
    
    // Check strict exclusions
    if (p1 === "K" && p1_prime === "D" && ["C", "D"].includes(p2)) return 0;
    if (p1 === "K" && ["H", "Y"].includes(p1_prime) && p2 === "C") return 0;
    if (p1 === "R" && p1_prime === "K" && p2 === "C") return 0;
    if (p1 === "R" && ["H", "R"].includes(p1_prime) && p2 === "R") return 0;

    let prob = p1 === "R" ? 98 : 90;

    // Proline block & rescue
    if (p1_prime === "P") {
      if (p1 === "K" && p2 === "W") prob = 80;
      else if (p1 === "R" && p2 === "M") prob = 85;
      else return 2; // Proline blocks almost fully
    }

    // Penalties for acidic residues
    if (p1_prime === "D" || p1_prime === "E") prob -= 35;
    if (p2 === "D" || p2 === "E") prob -= 25;

    // Penalties for adjacent basic residues (inhibition)
    if (p1_prime === "K" || p1_prime === "R") prob -= 45;
    if (p2 === "K" || p2 === "R") prob -= 15;

    // Penalty for other inhibiting conditions
    if (p1_prime === "C") prob -= 20;

    return Math.max(1, Math.min(99, prob));
  }

  if (enzymeKey === "Ch_hi" || enzymeKey === "Ch_lo") {
    const isAromatic = ["F", "Y", "W"].includes(p1);
    const isLowSpec = ["L", "M", "H"].includes(p1);

    if (!isAromatic && (enzymeKey === "Ch_hi" || !isLowSpec)) return 0;

    let prob = 0;
    if (p1 === "W") prob = 96;
    else if (p1 === "F") prob = 90;
    else if (p1 === "Y") prob = 86;
    else if (p1 === "L") prob = 65;
    else if (p1 === "M") prob = 58;
    else if (p1 === "H") prob = 42;

    // Proline block
    if (p1_prime === "P") return 1;

    // Specific blocks/exceptions
    if (p1 === "W" && p1_prime === "M") prob -= 75;
    if (p1 === "M" && p1_prime === "Y") prob -= 70;
    if (p1 === "H" && ["D", "M", "W"].includes(p1_prime)) prob -= 65;

    // Penalties for acidic residues
    if (p1_prime === "D" || p1_prime === "E") prob -= 25;
    if (p2 === "D" || p2 === "E") prob -= 15;

    return Math.max(1, Math.min(99, prob));
  }

  // Fallback for standard enzymes: 100% if they cleave, 0% if they don't
  const enzyme = ENZYMES.find(e => e.key === enzymeKey);
  if (enzyme && enzyme.cleave(p4, p3, p2, p1, p1_prime, p2_prime)) {
    return 100;
  }
  return 0;
}

module.exports = {
  ENZYMES,
  calculateProbability
};
