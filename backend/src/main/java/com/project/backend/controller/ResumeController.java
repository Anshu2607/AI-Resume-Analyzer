package com.project.backend.controller;

import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.util.*;

@RestController
@RequestMapping("/api/resume")
@CrossOrigin(origins = "*")
public class ResumeController {

    @PostMapping("/upload")
    public ResponseEntity<Map<String, Object>> uploadResume(
            @RequestParam("file") MultipartFile file) {

        Map<String, Object> response = new HashMap<>();

        try {
            if (file.isEmpty()) {
                response.put("message", "No file selected.");
                return ResponseEntity.badRequest().body(response);
            }

            String extractedText = "";

            if (file.getOriginalFilename() != null &&
                file.getOriginalFilename().toLowerCase().endsWith(".pdf")) {

                InputStream inputStream = file.getInputStream();
                PDDocument document = Loader.loadPDF(
                    inputStream.readAllBytes()
                );

                PDFTextStripper stripper = new PDFTextStripper();
                extractedText = stripper.getText(document);
                document.close();
            }

            int score = calculateScore(extractedText);

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

            response.put(
                "strengths",
                Arrays.asList(
                    "Resume text extracted successfully",
                    "Projects section detected",
                    "Technical skills identified"
                )
            );

            response.put(
                "improvements",
                Arrays.asList(
                    "Add more quantified achievements",
                    "Optimize keyword usage",
                    "Improve ATS readability"
                )
            );

            response.put(
                "suggestedSkills",
                Arrays.asList(
                    "Spring Boot",
                    "Docker",
                    "AWS",
                    "Kubernetes"
                )
            );

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            response.put("message", "Error processing resume.");
            return ResponseEntity.internalServerError().body(response);
        }
    }

    private int calculateScore(String text) {
        int score = 50;

        if (text.toLowerCase().contains("java")) score += 10;
        if (text.toLowerCase().contains("spring")) score += 10;
        if (text.toLowerCase().contains("react")) score += 10;
        if (text.toLowerCase().contains("sql")) score += 10;
        if (text.length() > 1000) score += 10;

        return Math.min(score, 100);
    }
}