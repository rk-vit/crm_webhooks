#include<stdio.h>
#define MAX 100

int arr[100];

int main(){
    int n = 10;
    for(int i=0; i<n; i++){
        printf("Enter element %d: ", i+1);
        scanf("%d", &arr[i]);
    }
    printf("You entered:\n");
    for(int i=0; i<n; i++){
        printf("%d ", arr[i]);
    }
}