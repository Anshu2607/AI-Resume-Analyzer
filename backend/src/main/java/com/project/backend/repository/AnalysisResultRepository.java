package com.project.backend.repository;

import com.project.backend.entity.AnalysisResult;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AnalysisResultRepository
        extends JpaRepository<AnalysisResult, Long> {
}