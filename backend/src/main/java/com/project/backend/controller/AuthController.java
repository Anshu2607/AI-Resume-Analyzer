package com.project.backend.controller;

import com.project.backend.dto.LoginRequest;
import com.project.backend.dto.RegisterRequest;
import com.project.backend.entity.User;
import com.project.backend.repository.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;
import java.util.regex.Pattern;

@RestController
@RequestMapping("/auth")
@CrossOrigin(origins = "*")
public class AuthController {

    private final UserRepository userRepository;

    public AuthController(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    private static final Pattern EMAIL_PATTERN =
            Pattern.compile("^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$");

    @PostMapping("/register")
    public ResponseEntity<Map<String, String>> register(
            @RequestBody RegisterRequest request) {

        Map<String, String> response = new HashMap<>();

        try {
            if (request.getName() == null || request.getName().trim().isEmpty() ||
                request.getUsername() == null || request.getUsername().trim().isEmpty() ||
                request.getEmail() == null || request.getEmail().trim().isEmpty() ||
                request.getPassword() == null || request.getPassword().trim().isEmpty()) {

                response.put("message", "All fields are required.");
                return ResponseEntity.badRequest().body(response);
            }

            String name = request.getName().trim();
            String username = request.getUsername().trim();
            String email = request.getEmail().trim().toLowerCase();
            String password = request.getPassword();

            if (!EMAIL_PATTERN.matcher(email).matches()) {
                response.put("message", "Please enter a valid email address.");
                return ResponseEntity.badRequest().body(response);
            }

            if (password.length() < 6) {
                response.put("message",
                        "Password must be at least 6 characters long.");
                return ResponseEntity.badRequest().body(response);
            }

            if (userRepository.existsByUsername(username)) {
                response.put("message", "Username already exists.");
                return ResponseEntity.badRequest().body(response);
            }

            if (userRepository.existsByEmail(email)) {
                response.put("message", "Email already exists.");
                return ResponseEntity.badRequest().body(response);
            }

            User user = new User();
            user.setName(name);
            user.setUsername(username);
            user.setEmail(email);
            user.setPassword(password);

            userRepository.save(user);

            response.put("message", "User registered successfully.");
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            e.printStackTrace();
            response.put("message", "Registration failed.");
            return ResponseEntity.internalServerError().body(response);
        }
    }

    @PostMapping("/login")
    public ResponseEntity<Map<String, String>> login(
            @RequestBody LoginRequest request) {

        Map<String, String> response = new HashMap<>();

        try {
            if (request.getIdentifier() == null ||
                request.getIdentifier().trim().isEmpty() ||
                request.getPassword() == null ||
                request.getPassword().trim().isEmpty()) {

                response.put("message",
                        "Username/Email and password are required.");
                return ResponseEntity.badRequest().body(response);
            }

            String identifier = request.getIdentifier().trim();
            String password = request.getPassword();

            User user = userRepository
                    .findByUsernameOrEmail(identifier, identifier)
                    .orElse(null);

            if (user == null ||
                !user.getPassword().equals(password)) {

                response.put("message", "Invalid credentials.");
                return ResponseEntity.badRequest().body(response);
            }

            response.put("message", "Login successful.");
            response.put("name", user.getName());
            response.put("username", user.getUsername());
            response.put("email", user.getEmail());

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            e.printStackTrace();
            response.put("message", "Login failed.");
            return ResponseEntity.internalServerError().body(response);
        }
    }
}