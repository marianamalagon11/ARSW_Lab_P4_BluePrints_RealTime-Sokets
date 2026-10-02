package co.edu.eci.blueprints.controllers;

import co.edu.eci.blueprints.dto.ApiResponse;
import co.edu.eci.blueprints.persistence.BlueprintNotFoundException;
import co.edu.eci.blueprints.persistence.BlueprintPersistenceException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class ApiExceptionHandler {

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse<Object>> handleValidation(MethodArgumentNotValidException ex) {
        String mensaje = ex.getBindingResult().getFieldErrors().get(0).getDefaultMessage();
        ApiResponse<Object> body = new ApiResponse<>(400, mensaje, null);
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(body);
    }

    @ExceptionHandler(BlueprintNotFoundException.class)
    public ResponseEntity<ApiResponse<Object>> handleNotFound(BlueprintNotFoundException ex) {
        ApiResponse<Object> body = new ApiResponse<>(404, ex.getMessage(), null);
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(body);
    }

    @ExceptionHandler(BlueprintPersistenceException.class)
    public ResponseEntity<ApiResponse<Object>> handleConflict(BlueprintPersistenceException ex) {
        ApiResponse<Object> body = new ApiResponse<>(403, ex.getMessage(), null);
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(body);
    }
}