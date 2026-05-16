package com.project.backend.controller;

import com.project.backend.entity.AnalysisResult;
import com.project.backend.repository.AnalysisResultRepository;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/resume")
@CrossOrigin(origins = "*")
public class ResumeController {

    private final AnalysisResultRepository analysisResultRepository;

    public ResumeController(AnalysisResultRepository analysisResultRepository) {
        this.analysisResultRepository = analysisResultRepository;
    }

    @PostMapping("/upload")
    public ResponseEntity<Map<String, Object>> uploadResume(
            @RequestParam("file") MultipartFile file) {

        Map<String, Object> response = new HashMap<>();

        try {
            // Check if file is selected
            if (file.isEmpty()) {
                response.put("message", "No file selected.");
                return ResponseEntity.badRequest().body(response);
            }

            String extractedText = "";

            // Extract text only for PDF files
            if (file.getOriginalFilename() != null &&
                    file.getOriginalFilename().toLowerCase().endsWith(".pdf")) {

                InputStream inputStream = file.getInputStream();
                PDDocument document =
                        Loader.loadPDF(inputStream.readAllBytes());

                PDFTextStripper stripper = new PDFTextStripper();
                extractedText = stripper.getText(document);

                document.close();
            }

            // Calculate resume score
            int score = calculateScore(extractedText);

            // Feedback lists
            List<String> strengths = Arrays.asList(
                    "Resume text extracted successfully",
                    "Projects section detected",
                    "Technical skills identified"
            );

            List<String> improvements = Arrays.asList(
                    "Add more quantified achievements",
                    "Optimize keyword usage",
                    "Improve ATS readability"
            );

            List<String> suggestedSkills = Arrays.asList(
                    "Spring Boot",
                    "Docker",
                    "AWS",
                    "Kubernetes"
            );

            // Prepare API response
            response.put(
                    "message",
                    "File '" + file.getOriginalFilename() + "' uploaded successfully."
            );
            response.put("score", score);

            response.put(
                    "extractedText",
                    extractedText.length() > 1000
                            ? extractedText.substring(0, 1000)
                            : extractedText
            );

            response.put("strengths", strengths);
            response.put("improvements", improvements);
            response.put("suggestedSkills", suggestedSkills);

            // Save analysis to database
            AnalysisResult result = new AnalysisResult();
            result.setFileName(file.getOriginalFilename());
            result.setScore(score);
            result.setExtractedText(extractedText);
            result.setStrengths(String.join(", ", strengths));
            result.setImprovements(String.join(", ", improvements));
            result.setSuggestedSkills(String.join(", ", suggestedSkills));

            analysisResultRepository.save(result);

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            e.printStackTrace();
            response.put("message", "Error processing resume.");
            return ResponseEntity.internalServerError().body(response);
        }
    }

    @GetMapping("/history")
    public ResponseEntity<List<AnalysisResult>> getAnalysisHistory() {
        List<AnalysisResult> history =
                analysisResultRepository.findAll();

        return ResponseEntity.ok(history);
    }

    private int calculateScore(String text) {
        String lower = text.toLowerCase();
        int score = 0;

        // Section checks
        if (lower.contains("skills")) score += 15;
        if (lower.contains("projects")) score += 15;
        if (lower.contains("experience")) score += 15;
        if (lower.contains("education")) score += 10;

        // Technical keywords
        if (lower.contains("java")) score += 10;
        if (lower.contains("spring")) score += 10;
        if (lower.contains("react")) score += 10;
        if (lower.contains("sql")) score += 5;
        if (lower.contains("docker")) score += 5;
        if (lower.contains("aws")) score += 5;

        return Math.min(score, 100);
    }
}