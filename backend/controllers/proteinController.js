// backend/controllers/proteinController.js

const uniprotService = require("../services/uniprotService");

/**
 * Search proteins
 */
const searchProteins = async (req, res) => {
  try {
    const { query, status, organism, offset = 0, limit = 10 } = req.query;

    const data = await uniprotService.searchProteins({
      query,
      status,
      organism,
      offset: parseInt(offset),
      limit: parseInt(limit),
    });

    res.json({
      success: true,
      data,
      pagination: {
        offset: parseInt(offset),
        limit: parseInt(limit),
      }
    });
  } catch (err) {
    console.error("Protein search error:", err.message);
    res.status(500).json({
      success: false,
      error: "Protein search failed. Please try again.",
      message: err.message
    });
  }
};

/**
 * Get detailed protein by accession ID
 * This is the critical endpoint for the protein detail page
 */
const getProteinById = async (req, res) => {
  try {
    const { id: accession } = req.params;

    if (!accession) {
      return res.status(400).json({
        success: false,
        error: "Accession ID is required"
      });
    }

    const proteinData = await uniprotService.getProteinById(accession);

    // Ensure goAnnotations is always present (safety net)
    if (!proteinData.function?.goAnnotations) {
      console.warn(`goAnnotations missing for ${accession}`);
    }

    res.json({
      success: true,
      data: proteinData,
      timestamp: new Date().toISOString()
    });

  } catch (err) {
    console.error(`Protein fetch error for ${req.params.id}:`, err.message);
    
    res.status(500).json({
      success: false,
      error: "Failed to fetch protein details",
      message: err.message,
      accession: req.params.id
    });
  }
};

module.exports = {
  searchProteins,
  getProteinById
};