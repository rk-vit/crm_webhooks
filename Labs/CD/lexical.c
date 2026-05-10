#include <stdio.h>
#include <string.h>
#include <ctype.h>
#include<stdlib.h>

struct symbol {
    char name[50];
    char datatype[20];
    char entrytype[20];
    char value[50];
    int address;
};

struct symbol table[100];
int count = 0;
int addressCounter = 100;

int exists(char *name) {
    for (int i = 0; i < count; i++)
        if (strcmp(table[i].name, name) == 0)
            return 1;
    return 0;
}

int typeSize(char *type) {
    if (!strcmp(type, "int")) return 4;
    if (!strcmp(type, "float")) return 4;
    if (!strcmp(type, "double")) return 8;
    if (!strcmp(type, "char")) return 1;
    return 0;
}

void add(char *name, char *datatype, char *entrytype, char *value, int size) {
    if (!exists(name)) {
        strcpy(table[count].name, name);
        strcpy(table[count].datatype, datatype);
        strcpy(table[count].entrytype, entrytype);
        strcpy(table[count].value, value);

        if (!strcmp(entrytype, "Variable")) {
            table[count].address = addressCounter;
            addressCounter += size;
        } else {
            table[count].address = -1;
        }
        count++;
    }
}

int isKeyword(char *str) {
    char k[32][10] = {
        "auto","break","case","char","const","continue","default","do","double","else",
        "enum","extern","float","for","goto","if","int","long","register","return",
        "short","signed","sizeof","static","struct","switch","typedef","union",
        "unsigned","void","volatile","while"
    };
    for (int i = 0; i < 32; i++)
        if (!strcmp(k[i], str))
            return 1;
    return 0;
}

int isNumber(char *str) {
    for (int i = 0; str[i]; i++)
        if (!isdigit(str[i]))
            return 0;
    return 1;
}

int main() {
    FILE *fp;
    char ch, buffer[50], lastType[20] = "", lastVar[50] = "";
    int j = 0, isArray = 0, arraySize = 0;

    fp = fopen("program.c", "r");
    if (!fp)
        return 0;

    while ((ch = fgetc(fp)) != EOF) {

        if (ch == '"') {
            while ((ch = fgetc(fp)) != '"' && ch != EOF);
            continue;
        }

        if (isalnum(ch) || ch == '_') {
            buffer[j++] = ch;
        }
        else if (ch == '(' && j != 0) {
            buffer[j] = '\0';
            if (!isKeyword(buffer))
                add(buffer, "-", "Function", "-", 0);
            j = 0;
        }
        else if (ch == '[') {
            isArray = 1;
            buffer[j] = '\0';
            strcpy(lastVar, buffer);
            j = 0;
        }
        else if (ch == ']' && isArray) {
            buffer[j] = '\0';
            arraySize = atoi(buffer);
            j = 0;
        }
        else {
            if (j != 0) {
                buffer[j] = '\0';

                if (isKeyword(buffer)) {
                    add(buffer, "-", "Keyword", "-", 0);
                    if (!strcmp(buffer, "int") || !strcmp(buffer, "float") ||
                        !strcmp(buffer, "char") || !strcmp(buffer, "double"))
                        strcpy(lastType, buffer);
                }
                else if (isNumber(buffer) && strlen(lastVar) > 0 && !isArray) {
                    for (int i = 0; i < count; i++)
                        if (!strcmp(table[i].name, lastVar))
                            strcpy(table[i].value, buffer);
                }
                else {
                    add(buffer, lastType, "Variable", "-", typeSize(lastType));
                    strcpy(lastVar, buffer);
                }
                j = 0;
            }
        }

        if (ch == ';' && isArray) {
            add(lastVar, lastType, "Variable", "-", typeSize(lastType) * arraySize);
            isArray = 0;
            arraySize = 0;
            lastVar[0] = '\0';
        }

        if (ch == '#') {
            char line[200];
            int i = 0;
            while ((ch = fgetc(fp)) != '\n' && ch != EOF)
                line[i++] = ch;
            line[i] = '\0';

            if (!strncmp(line, "define", 6)) {
                char name[50], value[50];
                sscanf(line + 6, "%s %s", name, value);
                add(name, "-", "Macro", value, 0);
            }
            else if (!strncmp(line, "include", 7)) {
                char header[50];
                int k = 7, m = 0;
                while (line[k] == ' ') k++;
                if (line[k] == '<' || line[k] == '"') {
                    char end = (line[k] == '<') ? '>' : '"';
                    k++;
                    while (line[k] != end)
                        header[m++] = line[k++];
                    header[m] = '\0';
                    add(header, "-", "Preprocessor", "-", 0);
                }
            }
        }
    }

    fclose(fp);

    printf("\nName\t\tDataType\tEntryType\tValue\tAddress\n");
    printf("------------------------------------------------------------\n");
    for (int i = 0; i < count; i++)
        printf("%-15s %-12s %-15s %-10s %-6d\n",
               table[i].name,
               table[i].datatype,
               table[i].entrytype,
               table[i].value,
               table[i].address);

    return 0;
}
