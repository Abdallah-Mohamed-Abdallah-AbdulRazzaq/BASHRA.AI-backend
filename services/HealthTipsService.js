const db = require('../config/db');

class HealthTipsService {
  
  // Get statistics for dashboard
  static async getHealthTipsStatistics() {
    try {
      const [dailyTipsStats] = await db.execute(`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active,
          SUM(CASE WHEN is_active = 0 THEN 1 ELSE 0 END) as inactive,
          SUM(CASE WHEN DATE(created_at) = CURDATE() THEN 1 ELSE 0 END) as today_created
        FROM daily_tips
      `);

      const [medicalArticlesStats] = await db.execute(`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active,
          SUM(CASE WHEN is_active = 0 THEN 1 ELSE 0 END) as inactive,
          SUM(CASE WHEN DATE(created_at) = CURDATE() THEN 1 ELSE 0 END) as today_created
        FROM medical_articles
      `);

      const [skinDiseasesStats] = await db.execute(`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active,
          SUM(CASE WHEN is_active = 0 THEN 1 ELSE 0 END) as inactive,
          SUM(CASE WHEN DATE(created_at) = CURDATE() THEN 1 ELSE 0 END) as today_created
        FROM skin_diseases_info
      `);

      return {
        daily_tips: dailyTipsStats[0],
        medical_articles: medicalArticlesStats[0],
        skin_diseases: skinDiseasesStats[0]
      };
    } catch (error) {
      throw new Error('خطأ في جلب إحصائيات النصائح الصحية: ' + error.message);
    }
  }

// Utility to normalize Arabic text for better search accuracy
static normalizeArabic(text) {
  if (!text) return '';
  return text
    .replace(/[ً-ٟ]/g, '') // Remove Tashkeel (diacritics)
    .replace(/أ/g, 'ا')
    .replace(/إ/g, 'ا')
    .replace(/آ/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ئ/g, 'ي')
    .replace(/ؤ/g, 'و');
}

// Search across all health tips content with hybrid approach
static async searchHealthTips(searchTerm, limit = 20, offset = 0) {
  try {
    console.log('Search term received:', searchTerm);
    
    // Create normalized Arabic patterns
    const normalizedTerm = this.normalizeArabic(searchTerm);
    const normalizedPattern = `%${normalizedTerm}%`;
    const normalizedExact = normalizedTerm;
    const normalizedStart = `${normalizedTerm}%`;
    const normalizedEnd = `%${normalizedTerm}`;
    const normalizedWord = `% ${normalizedTerm} %`;
    
    // Create original patterns for English searches
    const originalPattern = `%${searchTerm}%`;
    const exactPattern = searchTerm;
    const startPattern = `${searchTerm}%`;
    const endPattern = `%${searchTerm}`;
    const wordPattern = `% ${searchTerm} %`;
    
    console.log('Normalized search pattern:', normalizedPattern);
    console.log('Original search pattern:', originalPattern);

    // Search in daily tips with hybrid approach (relevance + Arabic normalization)
    const [dailyTips] = await db.execute(`
      SELECT 'daily_tip' as type, id, title_ar, title_en, description_ar, description_en, created_at, is_active,
             CASE 
               -- Exact matches get highest score
               WHEN REPLACE(REPLACE(REPLACE(REPLACE(title_ar, 'أ', 'ا'), 'إ', 'ا'), 'آ', 'ا'), 'ى', 'ي') = ? 
                 OR title_en = ? THEN 100
               -- Start matches
               WHEN REPLACE(REPLACE(REPLACE(REPLACE(title_ar, 'أ', 'ا'), 'إ', 'ا'), 'آ', 'ا'), 'ى', 'ي') LIKE ? 
                 OR title_en LIKE ? THEN 90
               -- End matches
               WHEN REPLACE(REPLACE(REPLACE(REPLACE(title_ar, 'أ', 'ا'), 'إ', 'ا'), 'آ', 'ا'), 'ى', 'ي') LIKE ? 
                 OR title_en LIKE ? THEN 80
               -- Word boundary matches
               WHEN REPLACE(REPLACE(REPLACE(REPLACE(title_ar, 'أ', 'ا'), 'إ', 'ا'), 'آ', 'ا'), 'ى', 'ي') LIKE ? 
                 OR title_en LIKE ? THEN 70
               -- Description matches
               WHEN REPLACE(REPLACE(REPLACE(REPLACE(description_ar, 'أ', 'ا'), 'إ', 'ا'), 'آ', 'ا'), 'ى', 'ي') LIKE ? 
                 OR description_en LIKE ? THEN 60
               ELSE 50
             END as relevance_score
      FROM daily_tips 
      WHERE (
        REPLACE(REPLACE(REPLACE(REPLACE(title_ar, 'أ', 'ا'), 'إ', 'ا'), 'آ', 'ا'), 'ى', 'ي') LIKE ? OR
        REPLACE(REPLACE(REPLACE(REPLACE(description_ar, 'أ', 'ا'), 'إ', 'ا'), 'آ', 'ا'), 'ى', 'ي') LIKE ? OR
        title_en LIKE ? COLLATE utf8mb4_unicode_ci OR 
        description_en LIKE ? COLLATE utf8mb4_unicode_ci OR
        MATCH(title_ar, description_ar) AGAINST(? IN NATURAL LANGUAGE MODE) OR
        MATCH(title_en, description_en) AGAINST(? IN NATURAL LANGUAGE MODE)
      )
      AND is_active = 1
      ORDER BY relevance_score DESC, created_at DESC
    `, [
      normalizedExact, exactPattern, // exact match
      normalizedStart, startPattern, // starts with
      normalizedEnd, endPattern, // ends with
      normalizedWord, wordPattern, // word boundaries
      normalizedPattern, originalPattern, // contains in description
      normalizedPattern, normalizedPattern, originalPattern, originalPattern, // WHERE clause LIKE searches
      normalizedTerm, searchTerm // FULLTEXT searches
    ]);

    console.log('Daily tips found:', dailyTips.length);

    // Search in medical articles with hybrid approach
    const [medicalArticles] = await db.execute(`
      SELECT 'medical_article' as type, id, title_ar, title_en, description_ar, description_en, created_at, is_active,
             CASE 
               -- Exact matches get highest score
               WHEN REPLACE(REPLACE(REPLACE(REPLACE(title_ar, 'أ', 'ا'), 'إ', 'ا'), 'آ', 'ا'), 'ى', 'ي') = ? 
                 OR title_en = ? THEN 100
               -- Start matches
               WHEN REPLACE(REPLACE(REPLACE(REPLACE(title_ar, 'أ', 'ا'), 'إ', 'ا'), 'آ', 'ا'), 'ى', 'ي') LIKE ? 
                 OR title_en LIKE ? THEN 90
               -- End matches
               WHEN REPLACE(REPLACE(REPLACE(REPLACE(title_ar, 'أ', 'ا'), 'إ', 'ا'), 'آ', 'ا'), 'ى', 'ي') LIKE ? 
                 OR title_en LIKE ? THEN 80
               -- Word boundary matches
               WHEN REPLACE(REPLACE(REPLACE(REPLACE(title_ar, 'أ', 'ا'), 'إ', 'ا'), 'آ', 'ا'), 'ى', 'ي') LIKE ? 
                 OR title_en LIKE ? THEN 70
               -- Sub-title matches
               WHEN REPLACE(REPLACE(REPLACE(REPLACE(sub_title_ar, 'أ', 'ا'), 'إ', 'ا'), 'آ', 'ا'), 'ى', 'ي') LIKE ? 
                 OR sub_title_en LIKE ? THEN 65
               -- Description matches
               WHEN REPLACE(REPLACE(REPLACE(REPLACE(description_ar, 'أ', 'ا'), 'إ', 'ا'), 'آ', 'ا'), 'ى', 'ي') LIKE ? 
                 OR description_en LIKE ? THEN 60
               ELSE 50
             END as relevance_score
      FROM medical_articles 
      WHERE (
        REPLACE(REPLACE(REPLACE(REPLACE(title_ar, 'أ', 'ا'), 'إ', 'ا'), 'آ', 'ا'), 'ى', 'ي') LIKE ? OR
        REPLACE(REPLACE(REPLACE(REPLACE(sub_title_ar, 'أ', 'ا'), 'إ', 'ا'), 'آ', 'ا'), 'ى', 'ي') LIKE ? OR
        REPLACE(REPLACE(REPLACE(REPLACE(description_ar, 'أ', 'ا'), 'إ', 'ا'), 'آ', 'ا'), 'ى', 'ي') LIKE ? OR
        title_en LIKE ? COLLATE utf8mb4_unicode_ci OR 
        sub_title_en LIKE ? COLLATE utf8mb4_unicode_ci OR 
        description_en LIKE ? COLLATE utf8mb4_unicode_ci OR
        MATCH(title_ar, sub_title_ar, description_ar) AGAINST(? IN NATURAL LANGUAGE MODE) OR
        MATCH(title_en, sub_title_en, description_en) AGAINST(? IN NATURAL LANGUAGE MODE)
      )
      AND is_active = 1
      ORDER BY relevance_score DESC, created_at DESC
    `, [
      normalizedExact, exactPattern, // exact match
      normalizedStart, startPattern, // starts with
      normalizedEnd, endPattern, // ends with
      normalizedWord, wordPattern, // word boundaries
      normalizedPattern, originalPattern, // contains in sub_title
      normalizedPattern, originalPattern, // contains in description
      normalizedPattern, normalizedPattern, normalizedPattern, // WHERE clause Arabic LIKE searches
      originalPattern, originalPattern, originalPattern, // WHERE clause English LIKE searches
      normalizedTerm, searchTerm // FULLTEXT searches
    ]);

    console.log('Medical articles found:', medicalArticles.length);

    // Search in skin diseases info with hybrid approach
    const [skinDiseases] = await db.execute(`
      SELECT 'skin_disease' as type, id, title_ar, title_en, description_ar, description_en, created_at, is_active,
             CASE 
               -- Exact matches get highest score
               WHEN REPLACE(REPLACE(REPLACE(REPLACE(title_ar, 'أ', 'ا'), 'إ', 'ا'), 'آ', 'ا'), 'ى', 'ي') = ? 
                 OR title_en = ? THEN 100
               -- Start matches
               WHEN REPLACE(REPLACE(REPLACE(REPLACE(title_ar, 'أ', 'ا'), 'إ', 'ا'), 'آ', 'ا'), 'ى', 'ي') LIKE ? 
                 OR title_en LIKE ? THEN 90
               -- End matches
               WHEN REPLACE(REPLACE(REPLACE(REPLACE(title_ar, 'أ', 'ا'), 'إ', 'ا'), 'آ', 'ا'), 'ى', 'ي') LIKE ? 
                 OR title_en LIKE ? THEN 80
               -- Word boundary matches
               WHEN REPLACE(REPLACE(REPLACE(REPLACE(title_ar, 'أ', 'ا'), 'إ', 'ا'), 'آ', 'ا'), 'ى', 'ي') LIKE ? 
                 OR title_en LIKE ? THEN 70
               -- Description matches
               WHEN REPLACE(REPLACE(REPLACE(REPLACE(description_ar, 'أ', 'ا'), 'إ', 'ا'), 'آ', 'ا'), 'ى', 'ي') LIKE ? 
                 OR description_en LIKE ? THEN 60
               ELSE 50
             END as relevance_score
      FROM skin_diseases_info 
      WHERE (
        REPLACE(REPLACE(REPLACE(REPLACE(title_ar, 'أ', 'ا'), 'إ', 'ا'), 'آ', 'ا'), 'ى', 'ي') LIKE ? OR
        REPLACE(REPLACE(REPLACE(REPLACE(description_ar, 'أ', 'ا'), 'إ', 'ا'), 'آ', 'ا'), 'ى', 'ي') LIKE ? OR
        title_en LIKE ? COLLATE utf8mb4_unicode_ci OR 
        description_en LIKE ? COLLATE utf8mb4_unicode_ci OR
        MATCH(title_ar, description_ar) AGAINST(? IN NATURAL LANGUAGE MODE) OR
        MATCH(title_en, description_en) AGAINST(? IN NATURAL LANGUAGE MODE)
      )
      AND is_active = 1
      ORDER BY relevance_score DESC, created_at DESC
    `, [
      normalizedExact, exactPattern, // exact match
      normalizedStart, startPattern, // starts with
      normalizedEnd, endPattern, // ends with
      normalizedWord, wordPattern, // word boundaries
      normalizedPattern, originalPattern, // contains in description
      normalizedPattern, normalizedPattern, originalPattern, originalPattern, // WHERE clause LIKE searches
      normalizedTerm, searchTerm // FULLTEXT searches
    ]);

    console.log('Skin diseases found:', skinDiseases.length);

    // Combine results and sort by relevance score first, then by created_at
    const allResults = [...dailyTips, ...medicalArticles, ...skinDiseases]
      .sort((a, b) => {
        // First sort by relevance score (higher is better)
        if (b.relevance_score !== a.relevance_score) {
          return b.relevance_score - a.relevance_score;
        }
        // Then sort by creation date (newer first)
        return new Date(b.created_at) - new Date(a.created_at);
      })
      .slice(offset, offset + limit);

    console.log('Total results before pagination:', dailyTips.length + medicalArticles.length + skinDiseases.length);
    console.log('Results after pagination:', allResults.length);

    // Remove relevance_score from final results (internal use only)
    const cleanResults = allResults.map(result => {
      const { relevance_score, ...cleanResult } = result;
      return cleanResult;
    });

    return {
      results: cleanResults,
      total: dailyTips.length + medicalArticles.length + skinDiseases.length,
      breakdown: {
        daily_tips: dailyTips.length,
        medical_articles: medicalArticles.length,
        skin_diseases: skinDiseases.length
      }
    };
  } catch (error) {
    console.error('Search error details:', error);
    // Fallback to simple search if complex search fails
    return await this.simpleSearchHealthTips(searchTerm, limit, offset);
  }
}

  // Fallback simple search method
  static async simpleSearchHealthTips(searchTerm, limit = 20, offset = 0) {
    try {
      const searchPattern = `%${searchTerm}%`;
      
      // Simple search in daily tips
      const [dailyTips] = await db.execute(`
        SELECT 'daily_tip' as type, id, title_ar, title_en, description_ar, description_en, created_at, is_active
        FROM daily_tips 
        WHERE (title_ar LIKE ? OR title_en LIKE ? OR description_ar LIKE ? OR description_en LIKE ?)
        AND is_active = 1
      `, [searchPattern, searchPattern, searchPattern, searchPattern]);

      // Simple search in medical articles
      const [medicalArticles] = await db.execute(`
        SELECT 'medical_article' as type, id, title_ar, title_en, description_ar, description_en, created_at, is_active
        FROM medical_articles 
        WHERE (title_ar LIKE ? OR title_en LIKE ? OR sub_title_ar LIKE ? OR sub_title_en LIKE ? 
               OR description_ar LIKE ? OR description_en LIKE ?)
        AND is_active = 1
      `, [searchPattern, searchPattern, searchPattern, searchPattern, searchPattern, searchPattern]);

      // Simple search in skin diseases info
      const [skinDiseases] = await db.execute(`
        SELECT 'skin_disease' as type, id, title_ar, title_en, description_ar, description_en, created_at, is_active
        FROM skin_diseases_info 
        WHERE (title_ar LIKE ? OR title_en LIKE ? OR description_ar LIKE ? OR description_en LIKE ?)
        AND is_active = 1
      `, [searchPattern, searchPattern, searchPattern, searchPattern]);

      // Combine results and sort by created_at
      const allResults = [...dailyTips, ...medicalArticles, ...skinDiseases]
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(offset, offset + limit);

      return {
        results: allResults,
        total: dailyTips.length + medicalArticles.length + skinDiseases.length,
        breakdown: {
          daily_tips: dailyTips.length,
          medical_articles: medicalArticles.length,
          skin_diseases: skinDiseases.length
        }
      };
    } catch (error) {
      throw new Error('خطأ في البحث في النصائح الصحية: ' + error.message);
    }
  }

  // Get recent health tips (mixed content)
  static async getRecentHealthTips(limit = 10) {
    try {
      const [dailyTips] = await db.execute(`
        SELECT 'daily_tip' as type, id, title_ar, title_en, created_at, updated_at
        FROM daily_tips 
        WHERE is_active = 1
        ORDER BY created_at DESC 
        LIMIT ?
      `, [Math.ceil(limit / 3)]);

      const [medicalArticles] = await db.execute(`
        SELECT 'medical_article' as type, id, title_ar, title_en, created_at, updated_at
        FROM medical_articles 
        WHERE is_active = 1
        ORDER BY created_at DESC 
        LIMIT ?
      `, [Math.ceil(limit / 3)]);

      const [skinDiseases] = await db.execute(`
        SELECT 'skin_disease' as type, id, title_ar, title_en, created_at, updated_at
        FROM skin_diseases_info 
        WHERE is_active = 1
        ORDER BY created_at DESC 
        LIMIT ?
      `, [Math.ceil(limit / 3)]);

      // Combine and sort
      const recentTips = [...dailyTips, ...medicalArticles, ...skinDiseases]
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, limit);

      return recentTips;
    } catch (error) {
      throw new Error('خطأ في جلب النصائح الحديثة: ' + error.message);
    }
  }

  // Get health tips by admin
  static async getHealthTipsByAdmin(adminId, limit = 20, offset = 0) {
    try {
      const [dailyTips] = await db.execute(`
        SELECT 'daily_tip' as type, id, title_ar, title_en, created_at, updated_at, is_active
        FROM daily_tips 
        WHERE created_by = ?
        ORDER BY created_at DESC
      `, [adminId]);

      const [medicalArticles] = await db.execute(`
        SELECT 'medical_article' as type, id, title_ar, title_en, created_at, updated_at, is_active
        FROM medical_articles 
        WHERE created_by = ?
        ORDER BY created_at DESC
      `, [adminId]);

      const [skinDiseases] = await db.execute(`
        SELECT 'skin_disease' as type, id, title_ar, title_en, created_at, updated_at, is_active
        FROM skin_diseases_info 
        WHERE created_by = ?
        ORDER BY created_at DESC
      `, [adminId]);

      const allContent = [...dailyTips, ...medicalArticles, ...skinDiseases]
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(offset, offset + limit);

      return {
        content: allContent,
        total: dailyTips.length + medicalArticles.length + skinDiseases.length,
        breakdown: {
          daily_tips: dailyTips.length,
          medical_articles: medicalArticles.length,
          skin_diseases: skinDiseases.length
        }
      };
    } catch (error) {
      throw new Error('خطأ في جلب محتوى الأدمن: ' + error.message);
    }
  }

  // Bulk operations for health tips
  static async bulkUpdateStatus(ids, type, status, adminId) {
    try {
      let tableName;
      switch (type) {
        case 'daily_tip':
          tableName = 'daily_tips';
          break;
        case 'medical_article':
          tableName = 'medical_articles';
          break;
        case 'skin_disease':
          tableName = 'skin_diseases_info';
          break;
        default:
          throw new Error('نوع المحتوى غير صحيح');
      }

      const placeholders = ids.map(() => '?').join(',');
      const query = `
        UPDATE ${tableName} 
        SET is_active = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP 
        WHERE id IN (${placeholders})
      `;

      const [result] = await db.execute(query, [status, adminId, ...ids]);
      return result.affectedRows;
    } catch (error) {
      throw new Error('خطأ في التحديث المجمع: ' + error.message);
    }
  }

  // Get health tips content for export
  static async getHealthTipsForExport(type = 'all', isActive = null) {
    try {
      let results = {};

      if (type === 'all' || type === 'daily_tips') {
        let query = 'SELECT * FROM daily_tips';
        let params = [];
        
        if (isActive !== null) {
          query += ' WHERE is_active = ?';
          params.push(isActive);
        }
        
        query += ' ORDER BY created_at DESC';
        const [dailyTips] = await db.execute(query, params);
        results.daily_tips = dailyTips;
      }

      if (type === 'all' || type === 'medical_articles') {
        let query = 'SELECT * FROM medical_articles';
        let params = [];
        
        if (isActive !== null) {
          query += ' WHERE is_active = ?';
          params.push(isActive);
        }
        
        query += ' ORDER BY created_at DESC';
        const [medicalArticles] = await db.execute(query, params);
        results.medical_articles = medicalArticles;
      }

      if (type === 'all' || type === 'skin_diseases') {
        let query = 'SELECT * FROM skin_diseases_info';
        let params = [];
        
        if (isActive !== null) {
          query += ' WHERE is_active = ?';
          params.push(isActive);
        }
        
        query += ' ORDER BY created_at DESC';
        const [skinDiseases] = await db.execute(query, params);
        results.skin_diseases = skinDiseases;
      }

      return results;
    } catch (error) {
      throw new Error('خطأ في تصدير البيانات: ' + error.message);
    }
  }

  // Validate health tip data before operations
  static validateHealthTipData(data, type) {
    const errors = [];

    // Common validations
    if (!data.title_ar || data.title_ar.trim().length < 3) {
      errors.push('العنوان باللغة العربية مطلوب ويجب أن يكون على الأقل 3 أحرف');
    }

    if (!data.description_ar || data.description_ar.trim().length < 10) {
      errors.push('الوصف باللغة العربية مطلوب ويجب أن يكون على الأقل 10 أحرف');
    }

    // Type specific validations
    if (type === 'skin_disease' && data.website_link) {
      const urlPattern = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/;
      if (!urlPattern.test(data.website_link)) {
        errors.push('رابط الموقع غير صحيح');
      }
    }

    return errors;
  }
}

module.exports = HealthTipsService;