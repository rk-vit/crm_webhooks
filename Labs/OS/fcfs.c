#include<stdio.h>
int main(){
    int n;
    printf("Enter no of processors : ");
    scanf("%d\n",&n);

    int bt[n],at[n];
    for(int i=0;i<n;i++){
       printf("Enter arrival time : ");
       scanf("%d\n",&at[i]);
       
       printf("Enter burst time : ");
       scanf("%d\n",&bt[i]);
    }  

    int tat[n],wt[n];
    wt[0]=0;

    for(int i=0;i<n;i++){
        tat[i]=bt[i]+at[i];
        if(i>0){
            wt[i]=tat[i-1]-at[i];
            
            if(wt[i]<0)
                wt[i]=0;
        }
    }

    printf("Process\tArrival Time\tBurst Time\tTurnaround Time\tWaiting Time\n");
    for(int i=0;i<n;i++){   
        printf("%d\t%d\t\t%d\t\t%d\t\t%d\n",i+1,at[i],bt[i],tat[i],wt[i]);
    }   
    return 0;
}